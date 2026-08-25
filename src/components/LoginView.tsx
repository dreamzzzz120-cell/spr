import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase';
import SPRLogo from './SPRLogo';

interface LoginViewProps {
  onLoginSuccess: (user: { uid: string; email: string | null; displayName: string; token: string; emailVerified: boolean; onboarded: 0 }) => void;
}

const authMessage = (error: any, fallback: string) => {
  switch (error?.code) {
    case 'auth/invalid-credential': case 'auth/user-not-found': case 'auth/wrong-password': return 'The email or password is incorrect.';
    case 'auth/email-already-in-use': return 'An account already exists for this email. Sign in instead.';
    case 'auth/invalid-email': return 'Enter a valid email address.';
    case 'auth/weak-password': return 'Choose a stronger password with at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'We could not reach the sign-in service. Check your connection and retry.';
    case 'auth/popup-blocked': return 'Your browser blocked the Google sign-in window. Try again.';
    case 'auth/popup-closed-by-user': case 'auth/cancelled-popup-request': return '';
    case 'auth/unauthorized-domain': case 'auth/operation-not-allowed': case 'auth/configuration-not-found': case 'auth/app-not-authorized': case 'auth/invalid-api-key': return 'Sign-in is not configured for this environment. Contact your administrator.';
    default: return fallback;
  }
};

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const useMockAuth = import.meta.env.VITE_FIREBASE_USE_MOCK_AUTH === 'true';
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const completeSignIn = async (firebaseUser: User) => {
    if (!firebaseUser) throw new Error('Authentication returned no user.');
    await reload(firebaseUser);
    const token = await firebaseUser.getIdToken(true);
    onLoginSuccess({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'SPR user', token, emailVerified: firebaseUser.emailVerified, onboarded: 0 });
  };

  useEffect(() => {
    let active = true;
    getRedirectResult(auth).then(async (result) => {
      if (!active || !result?.user) return;
      setLoading(true);
      try { await completeSignIn(result.user); }
      catch (err: any) { if (active) setError(authMessage(err, 'Google sign-in could not be completed.')); }
      finally { if (active) setLoading(false); }
    }).catch((err) => { if (active) setError(authMessage(err, 'Google sign-in could not be completed.')); });
    return () => { active = false; };
  }, []);

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setNotice(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError('Enter your email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (mode === 'signup' && password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      if (useMockAuth) { onLoginSuccess({ uid: 'dev-user-1', email: normalizedEmail, displayName: normalizedEmail.split('@')[0] || 'dev-user', token: 'mock-token-dev', emailVerified: true, onboarded: 0 }); return; }
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        if (!credential.user.emailVerified) {
          await sendEmailVerification(credential.user); await signOut(auth); setNotice('Account created. Check your email and verify your address, then sign in.'); setMode('login'); setPassword(''); setConfirmPassword(''); return;
        }
        await completeSignIn(credential.user); return;
      }
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      await reload(credential.user);
      if (!credential.user.emailVerified) {
        try { await sendEmailVerification(credential.user); } catch {}
        await signOut(auth); setNotice('Please verify your email before signing in. We sent a fresh verification email.'); return;
      }
      await completeSignIn(credential.user);
    } catch (err: any) {
      console.error('[Firebase Auth] Email authentication failed:', err);
      setError(authMessage(err, mode === 'login' ? 'Sign-in failed. Please try again.' : 'Account creation failed. Please try again.') || null);
    } finally { setLoading(false); }
  };

  const signInWithGoogle = async () => {
    setLoading(true); setError(null); setNotice(null);
    try {
      if (useMockAuth) { onLoginSuccess({ uid: 'dev-google-user-1', email: 'dev@example.com', displayName: 'dev-user', token: 'mock-token-dev', emailVerified: true, onboarded: 0 }); return; }
      try { const result = await signInWithPopup(auth, googleAuthProvider); await completeSignIn(result.user); }
      catch (err: any) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(err?.code)) { await signInWithRedirect(auth, googleAuthProvider); return; } throw err; }
    } catch (err: any) { const message = authMessage(err, 'Google sign-in failed. Please try again.'); if (message) setError(message); }
    finally { setLoading(false); }
  };

  const resetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase(); setError(null); setNotice(null);
    if (!normalizedEmail) return setError('Enter your email first, then select “Forgot password?”.');
    setLoading(true);
    try { await sendPasswordResetEmail(auth, normalizedEmail); setNotice('Password reset instructions have been sent if an account exists for that email.'); }
    catch (err: any) { setError(authMessage(err, 'Password reset could not be started. Please try again.')); }
    finally { setLoading(false); }
  };

  const switchMode = (nextMode: 'login' | 'signup') => { setMode(nextMode); setError(null); setNotice(null); setPassword(''); setConfirmPassword(''); };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[minmax(320px,0.9fr)_minmax(480px,1.1fr)] lg:gap-6 lg:p-6">
      <section className="relative hidden overflow-hidden rounded-[2rem] bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" /><div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" /><div className="relative"><SPRLogo /><div className="mt-20 max-w-lg"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"><ShieldCheck className="h-4 w-4 text-indigo-300" />Software trust, organized</div><h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">Your software registry starts here.</h1><p className="mt-6 max-w-md text-base leading-7 text-slate-400">Manage software passports, evidence, risk, and compliance from one secure workspace.</p></div></div><p className="relative text-xs text-slate-500">Software Passport Registry</p></section>
      <section className="flex min-h-[calc(100vh-3rem)] items-center justify-center"><div className="w-full max-w-md py-8"><div className="mb-10 lg:hidden"><SPRLogo /></div><p className="text-sm font-semibold text-indigo-600">{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{mode === 'login' ? 'Sign in to SPR' : 'Create your account'}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{mode === 'login' ? 'Use your work email or continue with Google.' : 'Create your account, verify your email, then sign in.'}</p>
        <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1" aria-label="Authentication mode">{(['login', 'signup'] as const).map((item) => <button key={item} type="button" onClick={() => switchMode(item)} disabled={loading} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${mode === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{item === 'login' ? 'Sign in' : 'Create account'}</button>)}</div>
        {(error || notice) && <div role={error ? 'alert' : 'status'} className={`mt-5 flex gap-3 rounded-xl border p-3.5 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}<span>{error || notice}</span></div>}
        <form onSubmit={submitEmail} className="mt-6 space-y-5">
          <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700">Work email<input id="login-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} placeholder="you@company.com" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></label>
          <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700"><span className="flex items-center justify-between">Password{mode === 'login' && <button type="button" onClick={resetPassword} disabled={loading} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Forgot password?</button>}</span><span className="relative mt-2 block"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} placeholder="At least 6 characters" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 px-4 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
          {mode === 'signup' && <label htmlFor="signup-confirm-password" className="block text-sm font-semibold text-slate-700">Confirm password<input id="signup-confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} placeholder="Repeat your password" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></label>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <>{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight className="h-4 w-4" /></>}</button>
        </form>
        <div className="my-6 flex items-center gap-4 text-xs text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">or</div><button type="button" onClick={signInWithGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"><span className="text-lg font-bold">G</span>Continue with Google</button><p className="mt-8 text-center text-xs leading-5 text-slate-400">By continuing, you agree to your organization’s access and security policies.</p></div></section>
    </main>
  );
}
