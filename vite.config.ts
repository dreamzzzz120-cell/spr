import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // The production Vercel project currently stores Firebase client settings
  // without the VITE_ prefix. Vite intentionally exposes only VITE_* values
  // to browser code, so map the server-side build variables into the public
  // VITE_FIREBASE_* names at build time. Firebase browser config is not a
  // secret; server credentials remain server-only.
  const firebase = {
    apiKey: env.VITE_FIREBASE_API_KEY || env.apiKey || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.authDomain || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || env.projectId || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.storageBucket || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.messagingSenderId || '',
    appId: env.VITE_FIREBASE_APP_ID || env.appId || '',
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || env.measurementId || '',
    oAuthClientId: env.VITE_FIREBASE_OAUTH_CLIENT_ID || env.oAuthClientId || '',
  };

  return defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(firebase.apiKey),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(firebase.authDomain),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(firebase.projectId),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(firebase.storageBucket),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(firebase.messagingSenderId),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(firebase.appId),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(firebase.measurementId),
      'import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID': JSON.stringify(firebase.oAuthClientId),
    },
  });
});
