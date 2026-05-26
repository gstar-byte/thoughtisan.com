
import { initializeApp } from 'firebase/app';
import { 
  getAuth as getFirebaseAuthNative, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { getFirestore as getFirebaseFirestoreNative, collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, serverTimestamp, deleteField } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let db: any = null;
let auth: any = null;
let googleProvider: any = null;
let appleProvider: any = null;

// 按需初始化 Firebase
export const initFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  if (!db) {
    db = getFirebaseFirestoreNative(app, firebaseConfig.firestoreDatabaseId);
  }
  if (!auth) {
    auth = getFirebaseAuthNative(app);
  }
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
  }
  if (!appleProvider) {
    appleProvider = new OAuthProvider('apple.com');
  }
  return { app, db, auth, googleProvider, appleProvider };
};

// 导出 getter 函数
export const getDb = () => {
  if (!db) initFirebase();
  return db;
};

export const getAuth = () => {
  if (!auth) initFirebase();
  return auth;
};

export const getGoogleProvider = () => {
  if (!googleProvider) initFirebase();
  return googleProvider;
};

export const getAppleProvider = () => {
  if (!appleProvider) initFirebase();
  return appleProvider;
};

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
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
};
