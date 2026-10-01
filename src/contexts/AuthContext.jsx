import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();
const PROFILE_STORAGE_KEY = 'saran-jute-user-profile';

const readProfileSession = () => {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveProfileSession = (profile) => {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

const isEmailAdmin = (email) => {
  if (!email) return false;
  return email.toLowerCase() === 'saranjutebags@gmail.com';
};

const buildProfileFromFirebaseUser = (firebaseUser, fallbackRole = 'customer') => {
  const profile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
    role: isEmailAdmin(firebaseUser.email) ? 'admin' : fallbackRole,
  };

  if (firebaseUser.role) {
    profile.role = firebaseUser.role;
  }

  return profile;
};

// Translate Firebase auth codes into plain messages users can understand.
// Firebase's default text (e.g. "Firebase: Error (auth/invalid-credential).")
// must never be shown to users.
const friendlyAuthError = (code) => {
  const known = {
    'auth/invalid-credential': 'Incorrect email or password. Please check and try again.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/popup-closed-by-user': 'The sign-in window was closed. Please try again.',
    'auth/popup-blocked': 'Pop-up blocked by your browser. Please allow pop-ups and try again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  };
  return known[code] || 'Unable to complete that action right now. Please try again.';
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(() => readProfileSession());

  useEffect(() => {
    let isActive = true;

    // Safety net: never leave the UI stuck on the "Loading dashboard…" state
    // if the auth SDK is slow to initialize. Auth state is still applied
    // whenever it resolves, even after this timeout.
    const safetyTimer = setTimeout(() => {
      if (isActive) setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isActive) {
        return;
      }

      if (currentUser) {
        setUser(currentUser);

        // Race the profile read against a timeout so a slow Firestore
        // connection can never freeze the dashboard on loading.
        const profileSnap = await Promise.race([
          getDoc(doc(db, 'users', currentUser.uid)).catch(() => null),
          new Promise((resolve) => setTimeout(() => resolve(null), 7000)),
        ]);

        if (!isActive) {
          return;
        }

        if (profileSnap && profileSnap.exists()) {
          const profile = profileSnap.data();
          if (profile && isEmailAdmin(currentUser.email)) {
            profile.role = 'admin';
          }
          setUserData(profile);
          saveProfileSession(profile);
        } else {
          // Fall back to the last saved session, or build one from the
          // Firebase user — the app must never block on a profile read.
          const stored = readProfileSession();
          const fallbackProfile =
            (stored && stored.uid === currentUser.uid && stored) ||
            buildProfileFromFirebaseUser(currentUser);
          setUserData(fallbackProfile);
          saveProfileSession(fallbackProfile);
        }
      } else {
        setUser(null);
        const storedProfile = readProfileSession();
        setUserData(storedProfile);
      }

      setLoading(false);
    });

    return () => {
      isActive = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      try {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const profile = userDoc.exists()
          ? userDoc.data()
          : buildProfileFromFirebaseUser(userCredential.user);

        if (profile && isEmailAdmin(userCredential.user.email)) {
          profile.role = 'admin';
        }

        setUser(userCredential.user);
        setUserData(profile);
        saveProfileSession(profile);

        return { success: true, role: profile.role, user: userCredential.user };
      } catch (profileError) {
        console.warn('Firestore profile read unavailable, using fallback session:', profileError?.message || profileError);
        const fallbackProfile = buildProfileFromFirebaseUser(userCredential.user);
        setUser(userCredential.user);
        setUserData(fallbackProfile);
        saveProfileSession(fallbackProfile);

        return { success: true, role: fallbackProfile.role, user: userCredential.user };
      }
    } catch (error) {
      return { success: false, error: friendlyAuthError(error.code) };
    }
  };

  const signUp = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      const role = isEmailAdmin(email) ? 'admin' : 'customer';
      const userProfile = {
        uid: userCredential.user.uid,
        email,
        displayName: name,
        role,
        createdAt: new Date(),
      };

      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
      } catch (profileError) {
        console.warn('Firestore profile write unavailable, keeping local profile session:', profileError?.message || profileError);
      }

      setUser(userCredential.user);
      setUserData(userProfile);
      saveProfileSession(userProfile);

      return { success: true, role, user: userCredential.user };
    } catch (error) {
      return { success: false, error: friendlyAuthError(error.code) };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const role = isEmailAdmin(result.user.email) ? 'admin' : 'customer';
      let profile = buildProfileFromFirebaseUser(result.user, role);

      try {
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (!userDoc.exists()) {
          profile = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            role,
            createdAt: new Date(),
          };
          await setDoc(doc(db, 'users', result.user.uid), profile);
        } else {
          profile = userDoc.data();
          if (isEmailAdmin(result.user.email)) {
            profile.role = 'admin';
          }
        }
      } catch (profileError) {
        console.warn('Firestore profile sync unavailable for Google sign-in, using local fallback:', profileError?.message || profileError);
        profile = buildProfileFromFirebaseUser(result.user, role);
      }

      setUser(result.user);
      setUserData(profile);
      saveProfileSession(profile);

      return { success: true, role: profile.role, user: result.user };
    } catch (error) {
      return { success: false, error: friendlyAuthError(error.code) };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      setUser(null);
      setUserData(null);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    userData,
    loading,
    setUserData,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
