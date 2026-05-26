import firebaseConfig from '../../firebase-applet-config.json';
import { initializeApp } from 'firebase/app';
import { 
  getAuth as getFirebaseAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore as getFirebaseFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

// Lazy initialize Firebase - only when needed!
let app: any = null;
let dbInstance: any = null;
let authInstance: any = null;
let googleProviderInstance: any = null;
let appleProviderInstance: any = null;

function initFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  if (!dbInstance) {
    if (firebaseConfig.firestoreDatabaseId) {
      dbInstance = getFirebaseFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      dbInstance = getFirebaseFirestore(app);
    }
  }
  if (!authInstance) {
    authInstance = getFirebaseAuth(app);
  }
  if (!googleProviderInstance) {
    googleProviderInstance = new GoogleAuthProvider();
  }
  if (!appleProviderInstance) {
    appleProviderInstance = new OAuthProvider('apple.com');
  }
}

// Export getter functions instead of direct objects
export function getDb() {
  initFirebase();
  return dbInstance;
}

export function getAuth() {
  initFirebase();
  return authInstance;
}

export function getGoogleProvider() {
  initFirebase();
  return googleProviderInstance;
}

export function getAppleProvider() {
  initFirebase();
  return appleProviderInstance;
}

// Re-export standard Firebase SDK functions 
export {
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
};
