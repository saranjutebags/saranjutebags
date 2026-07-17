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

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isActive) {
        return;
      }

      if (currentUser) {
        setUser(currentUser);

        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (!isActive) {
            return;
          }

          const profile = userDoc.exists()
            ? userDoc.data()
            : buildProfileFromFirebaseUser(currentUser);

          if (profile && isEmailAdmin(currentUser.email)) {
            profile.role = 'admin';
          }

          setUserData(profile);
          saveProfileSession(profile);
        } catch (error) {
          console.warn('Firestore profile sync unavailable, using cached profile fallback:', error?.message || error);
          const fallbackProfile = buildProfileFromFirebaseUser(currentUser);
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
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
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
