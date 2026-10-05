import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider Google configurato con gli scopi: Drive (per i backup completi) e Calendar (per Scadenze Auto)
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
// Forza la selezione dell'account e la richiesta di consenso per le autorizzazioni
googleProvider.setCustomParameters({
  prompt: 'select_account consent',
  access_type: 'offline',
});

const TOKEN_STORAGE_KEY = 'cartracker_google_access_token';
const TOKEN_TIME_STORAGE_KEY = 'cartracker_google_token_time';

export const getStoredAccessToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const getStoredTokenTime = (): number => {
  try {
    const raw = localStorage.getItem(TOKEN_TIME_STORAGE_KEY) || sessionStorage.getItem(TOKEN_TIME_STORAGE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
};

let isSigningIn = false;
let cachedAccessToken: string | null = getStoredAccessToken();

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      const nowStr = Date.now().toString();
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_TIME_STORAGE_KEY, nowStr);
      sessionStorage.setItem(TOKEN_TIME_STORAGE_KEY, nowStr);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_TIME_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_TIME_STORAGE_KEY);
    }
  } catch {}
};

export const clearGoogleToken = () => {
  setCachedAccessToken(null);
};

// Verifica se il token Google è scaduto (i token Google scadono dopo 3600 secondi = 60 minuti)
export const isGoogleTokenExpired = (): boolean => {
  const token = cachedAccessToken || getStoredAccessToken();
  if (!token) return true;
  const time = getStoredTokenTime();
  if (!time) return false;
  // Considera scaduto se sono passati più di 50 minuti per prevenire 401 a metà operazione
  return Date.now() - time > 50 * 60 * 1000;
};

export const isDriveSessionActive = (): boolean => {
  const token = cachedAccessToken || getStoredAccessToken();
  if (!token) return false;
  return !isGoogleTokenExpired();
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const activeToken = cachedAccessToken || getStoredAccessToken();
      if (activeToken) {
        cachedAccessToken = activeToken;
      }
      if (onAuthSuccess) onAuthSuccess(user, activeToken);
    } else {
      setCachedAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (forceConsent: boolean = true): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    
    // Assicura che venga richiesto il cambio account e il consenso alle autorizzazioni
    if (forceConsent) {
      googleProvider.setCustomParameters({
        prompt: 'select_account consent',
      });
    } else {
      googleProvider.setCustomParameters({
        prompt: 'select_account',
      });
    }

    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Impossibile ottenere il token di accesso Google');
    }

    setCachedAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Errore durante il login Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Riconnessione rapida a Google Drive
export const reconnectGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  return googleSignIn(false);
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || getStoredAccessToken();
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const logout = async () => {
  setCachedAccessToken(null);
  await signOut(auth);
};
