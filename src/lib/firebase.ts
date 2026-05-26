/* src/lib/firebase.ts
 * Refactored Firebase initialization with top‑level exports.
 * Real Firebase SDK is loaded with dynamic import inside a try/catch.
 * If loading fails (e.g., blocked in China), a simple in‑memory mock provides the same API surface.
 */

let firebaseAvailable = false;

// Exported variables (will be assigned later)
export let db: any = null;
export let auth: any = null;
export let googleProvider: any = null;
export let appleProvider: any = null;

// Mock in‑memory store used when Firebase cannot be loaded
const mockStore: Record<string, Record<string, any>> = {
  users: {},
  capsules: {},
};

// --- Mock implementations (default) ---
export const signInWithPopup = async () => ({ user: { uid: 'local-anon' } });
export const signOut = async () => ({});
export const createUserWithEmailAndPassword = async (_: any, email: string, _pwd: string) => ({
  user: { uid: `local-${Date.now()}`, email },
});
export const signInWithEmailAndPassword = async () => ({ });
export const sendPasswordResetEmail = async () => {};
export const updateProfile = async () => {};
export const onAuthStateChanged = (callback: (user: any) => void) => {
  const mockUser = {
    uid: 'local-anon',
    email: null,
    displayName: 'Local User',
    isAnonymous: true,
  };
  callback(mockUser);
  return () => {};
};
export const collection = (db: any, name: string) => ({ name } as any);
export const query = (colRef: any, ..._conds: any[]) => colRef;
export const where = () => ({});
export const onSnapshot = (queryRef: any, onNext: (snap: any) => void) => {
  const docs = Object.values(mockStore[queryRef.name] || {}).map((doc: any) => ({
    id: doc.id,
    data: () => doc,
  }));
  onNext({ docs } as any);
  return () => {};
};
export const addDoc = async (colRef: any, data: any) => {
  const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  (mockStore[colRef.name] = mockStore[colRef.name] || {})[id] = { id, ...data };
  return { id } as any;
};
export const updateDoc = async (docRef: any, updates: any) => {
  const coll = mockStore[docRef.col];
  if (coll && coll[docRef.id]) Object.assign(coll[docRef.id], updates);
};
export const deleteDoc = async (docRef: any) => {
  const coll = mockStore[docRef.col];
  if (coll) delete coll[docRef.id];
};
export const doc = (db: any, col: string, id: string) => ({ col, id } as any);
export const serverTimestamp = () => Date.now();
export type User = any;

// Lazy‑load Firebase SDK only when needed
let firebaseLoading = false;
export async function loadFirebaseSDK() {
  if (firebaseLoading) return;
  firebaseLoading = true;
  try {
    const { initializeApp } = await import('firebase/app');
    const {
      getAuth,
      GoogleAuthProvider,
      OAuthProvider,
      signInWithPopup: _signInWithPopup,
      signOut: _signOut,
      createUserWithEmailAndPassword: _createUserWithEmailAndPassword,
      signInWithEmailAndPassword: _signInWithEmailAndPassword,
      sendPasswordResetEmail: _sendPasswordResetEmail,
      updateProfile: _updateProfile,
      onAuthStateChanged: _onAuthStateChanged,
    } = await import('firebase/auth');
    const {
      getFirestore,
      collection: _collection,
      addDoc: _addDoc,
      updateDoc: _updateDoc,
      deleteDoc: _deleteDoc,
      doc: _doc,
      query: _query,
      where: _where,
      onSnapshot: _onSnapshot,
      serverTimestamp: _serverTimestamp,
    } = await import('firebase/firestore');
    const firebaseConfig = (await import('../../firebase-applet-config.json')).default;
    const app = initializeApp(firebaseConfig);

    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    appleProvider = new OAuthProvider('apple.com');

    (globalThis as any).signInWithPopup = _signInWithPopup;
    (globalThis as any).signOut = _signOut;
    (globalThis as any).createUserWithEmailAndPassword = _createUserWithEmailAndPassword;
    (globalThis as any).signInWithEmailAndPassword = _signInWithEmailAndPassword;
    (globalThis as any).sendPasswordResetEmail = _sendPasswordResetEmail;
    (globalThis as any).updateProfile = _updateProfile;
    (globalThis as any).onAuthStateChanged = _onAuthStateChanged;
    (globalThis as any).collection = _collection;
    (globalThis as any).query = _query;
    (globalThis as any).where = _where;
    (globalThis as any).onSnapshot = _onSnapshot;
    (globalThis as any).addDoc = _addDoc;
    (globalThis as any).updateDoc = _updateDoc;
    (globalThis as any).deleteDoc = _deleteDoc;
    (globalThis as any).doc = _doc;
    (globalThis as any).serverTimestamp = _serverTimestamp;

    firebaseAvailable = true;
    console.log('Firebase SDK loaded lazily.');
  } catch (e) {
    console.warn('Firebase could not be loaded – falling back to mock implementation.', e);
  }
}
