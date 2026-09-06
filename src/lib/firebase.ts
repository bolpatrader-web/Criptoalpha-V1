import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: "silicon-beaker-gc9s2",
  appId: "1:747936660119:web:425a3783f89becd51887d2",
  apiKey: "AIzaSyCWK3msd0TQH0iMVf6Dnl8YMoej2hGO5Oc",
  authDomain: "silicon-beaker-gc9s2.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-criptoalphav5pla-bf016290-1486-42bc-9800-67b386347b08",
  storageBucket: "silicon-beaker-gc9s2.firebasestorage.app",
  messagingSenderId: "747936660119",
  measurementId: "",
  oAuthClientId: "747936660119-u0fu7m697bhtdj607ae084euk9cl33n5.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Desactivar logs verbose en consola para evitar spam de backoff cuando la cuota de Firestore se agota
try {
  setLogLevel('silent');
} catch {}

export default app;
