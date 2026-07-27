'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Database, ref, query, orderByChild, equalTo, onValue, get } from 'firebase/database';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  database: Database;
  auth: Auth;
  storage: FirebaseStorage;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, database, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  database: Database | null;
  auth: Auth | null; // The Auth service instance
  storage: FirebaseStorage | null;
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
  userProfile: any | null;
  isProfileLoading: boolean;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  database: Database;
  auth: Auth;
  storage: FirebaseStorage;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  userProfile: any | null;
  isProfileLoading: boolean;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  userProfile: any | null;
  isProfileLoading: boolean;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  database,
  auth,
  storage,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  const [userProfileState, setUserProfileState] = useState<{ profile: any; isProfileLoading: boolean }>({
    profile: null,
    isProfileLoading: false,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => { // Auth state determined
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth]); // Depends on the auth instance

  // Effect to fetch user profile efficiently using indexed query
  useEffect(() => {
    if (!userAuthState.user || !database) {
      setUserProfileState({ profile: null, isProfileLoading: false });
      return;
    }

    setUserProfileState(prev => ({ ...prev, isProfileLoading: true }));

    // Primary: Query system_users by uid index
    const q = query(ref(database, 'system_users'), orderByChild('uid'), equalTo(userAuthState.user.uid));

    const unsubscribe = onValue(q, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const keys = Object.keys(val);
        const first = { ...val[keys[0]], id: keys[0] };
        setUserProfileState({ profile: first, isProfileLoading: false });
      } else {
        // Fallback: Check if username matches email username (e.g. agus@umkm.id -> system_users/agus)
        const emailUsername = userAuthState.user?.email?.split('@')[0]?.toLowerCase();
        if (emailUsername) {
          const directRef = ref(database, `system_users/${emailUsername}`);
          get(directRef).then((dirSnap) => {
            if (dirSnap.exists()) {
              setUserProfileState({ profile: { ...dirSnap.val(), id: emailUsername }, isProfileLoading: false });
            } else {
              setUserProfileState({ profile: null, isProfileLoading: false });
            }
          }).catch(() => {
            setUserProfileState({ profile: null, isProfileLoading: false });
          });
        } else {
          setUserProfileState({ profile: null, isProfileLoading: false });
        }
      }
    }, (err) => {
      console.error("Error fetching user profile:", err);
      setUserProfileState({ profile: null, isProfileLoading: false });
    });

    return () => unsubscribe();
  }, [userAuthState.user, database]);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && database && auth && storage);
    
    const createStub = (name: string) => ({
      _checkNotDeleted: () => {},
      _getActualRepo: () => ({ repoInfo_: { host: 'localhost' } }),
      _repo: { repoInfo_: { host: 'localhost' } },
      app: { name: '[DEFAULT]' },
      INTERNAL: {},
      toString: () => `[Firebase Stub ${name}]`
    } as any);

    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: firebaseApp || createStub('App'),
      database: database || createStub('Database'),
      auth: auth || createStub('Auth'),
      storage: storage || createStub('Storage'),
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      userProfile: userProfileState.profile,
      isProfileLoading: userProfileState.isProfileLoading,
    };
  }, [firebaseApp, database, auth, storage, userAuthState.user, userAuthState.isUserLoading, userAuthState.userError, userProfileState.profile, userProfileState.isProfileLoading]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  // Cast context directly as it HAS the fields (either real services or build-time stubs)
  return context as unknown as FirebaseServicesAndUser;
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Database instance. */
export const useDatabase = (): Database => {
  const { database } = useFirebase();
  return database;
};

/** Hook to access Storage instance. */
export const useStorage = (): FirebaseStorage => {
  const { storage } = useFirebase();
  return storage;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { // Renamed from useAuthUser
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  // No need to create a new object literal here.
  // The context itself has { user, isUserLoading, userError } and is memoized.
  return context as unknown as UserHookResult;
};