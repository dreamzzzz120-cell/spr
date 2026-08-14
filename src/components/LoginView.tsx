import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  type User
} from 'firebase/auth';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase';
import SPRLogo from './SPRLogo';

interface LoginViewProps {
  onLoginSuccess: (user: {
    uid: string;
    email: string | null;
    displayName: string;
    token: string;
    emailVerified: boolean;
    onboarded: 0;
  }) => void;
}

const authMessage = (error: any, fallback: string) => {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account already exists for this email.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Choose a stronger password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'We could not reach the sign-in service. Check your connection and retry.';
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
    case 'auth/app-not-authorized':
    case 'auth/invalid-api-key':
      return 'Sign-in is not configured for this environment. Contact your administrator.';
    default:
      return fallback;
  }
};

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  // Enable a development-only mock auth flow when running locally or when explicitly requested.
  // This makes it easy to test the UI without requiring a working Firebase project.
  const useMockAuth = (import.meta.env.DEV === true || import.meta.env.VITE_FIREBASE_USE_MOCK_AUTH === 'true' || (import.meta.env.MODE !== 'production' && !import.meta.env.VITE_FIREBASE_API_KEY));

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const completeSignIn = async (user: User | null) => {
    if (useMockAuth) {
      // Mock user payload for local development/testing
      const mock = {
        uid: 'dev-user-1',
        email: email || 'dev@example.com',
        displayName: (email && email.split('@')[0]) || 'dev-user',
        token: 'mock-token-dev',
        emailVerified: true,
        onboarded: 0
      };
      onLoginSuccess(mock as any);
      return;
    }

    if (!user) return;
    const token = await user.getIdToken(true);
    onLoginSuccess({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'SPR user',
      token,
      emailVerified: user.emailVerified,
      onboarded: 0
    });
  };

  useEffect(() => {
    let active = true;
    getRedirectResult(auth)
      .then((result) => result?.user && active ? completeSignIn(result.user) : undefined)
      .catch((err) => active && setError(authMessage(err, 'Google sign-in could not be completed.')));
    return () => { active = false; };
  }, []);

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError('Enter your email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (mode === 'signup' && password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      if (useMockAuth) {
        // Simulate a successful login/signup in dev
        await new Promise((r) => setTimeout(r, 200));
        await completeSignIn(null);
        return;
      }

      const credential = mode === 'login'
        ? await signInWithEmailAndPassword(auth, normalizedEmail, password)
        : await createUserWithEmailAndPassword(auth, normalizedEmail, password);

      if (mode === 'signup' && !credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
      }
      await completeSignIn(credential.user);
    } catch (err: any) {
      console.error('[Firebase Auth] Email authentication failed:', err);
      setError(authMessage(err, mode === 'login' ? 'Sign-in failed. Please try again.' : 'Account creation failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (useMockAuth) {
        // Simulate Google sign-in in dev
        await new Promise((r) => setTimeout(r, 200));
        await completeSignIn(null);
        return;
      }

      const result = await signInWithPopup(auth, googleAuthProvider);
      await completeSignIn(result.user);
    } catch (err: any) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(err?.code)) {
        await signInWithRedirect(auth, googleAuthProvider);
        return;
      }
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('[Firebase Auth] Google authentication failed:', err);
        setError(authMessage(err, 'Google sign-in failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setNotice(null);
    if (!normalizedEmail) return setError('Enter your email first, then select “Forgot password?”.');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setNotice('Password reset instructions have been sent if an account exists for that email.');
    } catch (err: any) {
      console.error('[Firebase Auth] Password reset failed:', err);
      setError(authMessage(err, 'Password reset could not be started. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setConfirmPassword('');
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[minmax(320px,0.9fr)_minmax(480px,1.1fr)] lg:gap-6 lg:p-6">
      <section className="relative hidden overflow-hidden rounded-[2rem] bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative">
          <SPRLogo />
          <div className="mt-20 max-w-lg">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-indigo-300" />
              Software trust, organized
            </div>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">Your software registry starts here.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
              Manage software passports, evidence, risk, and compliance from one secure workspace.
            </p>
          </div>
        </div>
        <p className="relative text-xs text-slate-500">Software Passport Registry</p>
      </section>

      <section className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <div className="w-full max-w-md py-8">
          <div className="mb-10 lg:hidden"><SPRLogo /></div>
          <p className="text-sm font-semibold text-indigo-600">{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {mode === 'login' ? 'Sign in to SPR' : 'Create your account'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {mode === 'login' ? 'Use your work email or continue with Google.' : 'Start with your work email. You’ll verify it before entering the workspace.'}
          </p>

          <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1" aria-label="Authentication mode">
            {(['login', 'signup'] as const).map((item) => (
              <button key={item} type="button" onClick={() => switchMode(item)}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${mode === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {item === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {(error || notice) && (
            <div role={error ? 'alert' : 'status'} className={`mt-5 flex gap-3 rounded-xl border p-3.5 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{error || notice}</span>
            </div>
          )}

          <form onSubmit={submitEmail} className="mt-6 space-y-5">
            <label className="block text-sm font-semibold text-slate-700">
              Work email
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={loading} placeholder="you@company.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              <span className="flex items-center justify-between">
                Password
                {mode === 'login' && <button type="button" onClick={resetPassword} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Forgot password?</button>}
              </span>
              <span className="relative mt-2 block">
                <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-4 text-slate-400 hover:text-slate-700">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {mode === 'signup' && (
              <label className="block text-sm font-semibold text-slate-700">
                Confirm password
                <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} placeholder="Repeat your password"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
              </label>
            )}

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <>{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">or</div>
          <button type="button" onClick={signInWithGoogle} disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60">
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.62.39 3.15 1.04 4.54l3.35-2.62Z" />
              <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
            </svg>
            Continue with Google
          </button>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">By continuing, you agree to your organization’s access and security policies.</p>
        </div>
      </section>
    </main>
  );
}
