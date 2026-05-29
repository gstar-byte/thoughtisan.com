
import { initializeApp } from 'firebase/app';
import { 
  getAuth as getFirebaseAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, serverTimestamp, deleteField } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

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
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

export { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  deleteField,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
};
