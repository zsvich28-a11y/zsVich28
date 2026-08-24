import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Request Gmail send scope
provider.addScope('https://www.googleapis.com/auth/gmail.send');
// Select account prompt
provider.setCustomParameters({
  prompt: 'select_account'
});

// Helper to check for a custom Client ID saved in settings
function getCustomClientId(): string | null {
  try {
    const saved = localStorage.getItem('houseman_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.googleClientId && typeof parsed.googleClientId === 'string' && parsed.googleClientId.trim() !== '') {
        return parsed.googleClientId.trim();
      }
    }
  } catch (e) { /* ignore */ }
  return null;
}

// Session-persisted state for custom OAuth login
let customUser: any = null;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

try {
  const savedUser = sessionStorage.getItem('custom_google_user');
  const savedToken = sessionStorage.getItem('custom_google_access_token');
  if (savedUser && savedToken) {
    customUser = JSON.parse(savedUser);
    cachedAccessToken = savedToken;
  }
} catch (e) { /* ignore */ }

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // If we have a custom logged-in user, trigger success immediately!
  if (customUser && cachedAccessToken) {
    if (onAuthSuccess) {
      onAuthSuccess(customUser as any, cachedAccessToken);
    }
    // Return a dummy unsubscribe function
    return () => {};
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    // If a custom login took place, ignore Firebase auth state changes
    if (customUser && cachedAccessToken) {
      return;
    }

    if (user) {
      // If we have a user but no cached token (e.g. page refreshed), 
      // we need to re-authenticate or clear.
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Clear stale auth since we don't have the token in memory
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    
    const customClientId = getCustomClientId();
    if (customClientId) {
      // Execute Custom Google OAuth 2.0 Implicit Flow
      return new Promise((resolve, reject) => {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
          client_id: customClientId,
          redirect_uri: window.location.origin,
          response_type: 'token',
          scope: 'https://www.googleapis.com/auth/gmail.send email profile openid',
          prompt: 'select_account'
        });
        
        const popup = window.open(
          authUrl,
          'google_oauth_popup',
          `width=${width},height=${height},top=${top},left=${left}`
        );
        
        if (!popup) {
          reject(new Error('Popup blocked. Please allow popups for this site.'));
          return;
        }
        
        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS' && event.data?.accessToken) {
            const token = event.data.accessToken;
            cachedAccessToken = token;
            
            // Fetch user info using the token to construct a mock User object
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (!res.ok) throw new Error('Failed to fetch user profile');
              const profile = await res.json();
              
              const mockUser = {
                uid: profile.sub,
                email: profile.email,
                displayName: profile.name,
                photoURL: profile.picture,
                emailVerified: profile.email_verified
              } as any;
              
              sessionStorage.setItem('custom_google_user', JSON.stringify(mockUser));
              sessionStorage.setItem('custom_google_access_token', token);
              customUser = mockUser;
              
              resolve({ user: mockUser, accessToken: token });
            } catch (err: any) {
              // Fallback user if profile fetch fails
              const mockUser = {
                uid: 'custom-google-user',
                email: 'custom@google.user',
                displayName: 'Custom User'
              } as any;
              
              sessionStorage.setItem('custom_google_user', JSON.stringify(mockUser));
              sessionStorage.setItem('custom_google_access_token', token);
              customUser = mockUser;
              
              resolve({ user: mockUser, accessToken: token });
            } finally {
              window.removeEventListener('message', handleMessage);
            }
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Detect closed popup window
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            setTimeout(() => {
              window.removeEventListener('message', handleMessage);
              // Wait a moment to see if resolution happened
              if (!cachedAccessToken) {
                reject(new Error('Sign in flow closed by user.'));
              }
            }, 1000);
          }
        }, 1000);
      });
    }

    // Default Firebase Auth Flow
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Google Auth');
      }

      cachedAccessToken = credential.accessToken;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (firebaseErr: any) {
      console.warn('Firebase signInWithPopup failed:', firebaseErr);
      
      // If unauthorized domain in Firebase, attempt direct Google GIS OAuth token request
      const fallbackClientId = (firebaseConfig as any).oAuthClientId;
      if (fallbackClientId && (window as any).google?.accounts?.oauth2) {
        return new Promise((resolve, reject) => {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: fallbackClientId,
            scope: 'https://www.googleapis.com/auth/gmail.send email profile openid',
            callback: async (tokenRes: any) => {
              if (tokenRes.error) {
                alert(`Google Login Error: ${tokenRes.error_description || tokenRes.error}`);
                reject(new Error(tokenRes.error_description || tokenRes.error));
                return;
              }
              if (tokenRes.access_token) {
                cachedAccessToken = tokenRes.access_token;
                try {
                  const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenRes.access_token}` }
                  });
                  const profile = await uRes.json();
                  const mockUser = {
                    uid: profile.sub,
                    email: profile.email,
                    displayName: profile.name,
                    photoURL: profile.picture,
                    emailVerified: profile.email_verified
                  } as any;
                  sessionStorage.setItem('custom_google_user', JSON.stringify(mockUser));
                  sessionStorage.setItem('custom_google_access_token', tokenRes.access_token);
                  customUser = mockUser;
                  resolve({ user: mockUser, accessToken: tokenRes.access_token });
                } catch {
                  const mockUser = { uid: 'google-user', email: 'user@google.com', displayName: 'Google User' } as any;
                  resolve({ user: mockUser, accessToken: tokenRes.access_token });
                }
              }
            }
          });
          client.requestAccessToken();
        });
      }

      if (firebaseErr?.code === 'auth/unauthorized-domain') {
        alert(
          `Грешка: Доменот "${window.location.hostname}" не е додаден во Firebase Authentication -> Settings -> Authorized Domains!\n\n` +
          `Отворете ја Firebase Console за проектот "${firebaseConfig.projectId}" и додадете го "${window.location.hostname}".`
        );
      } else if (firebaseErr?.code === 'auth/popup-blocked') {
        alert('Прелистувачот го блокираше скокачкиот прозорец (Popup). Дозволете скокачки прозорци за оваа веб-страница.');
      } else if (firebaseErr?.code === 'auth/cancelled-popup-request' || firebaseErr?.code === 'auth/popup-closed-by-user') {
        // user closed popup or closed early
      } else {
        alert(`Грешка при најава: ${firebaseErr.message || firebaseErr.code || firebaseErr}`);
      }
      throw firebaseErr;
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (e) { /* ignore */ }
  cachedAccessToken = null;
  customUser = null;
  sessionStorage.removeItem('custom_google_user');
  sessionStorage.removeItem('custom_google_access_token');
};

