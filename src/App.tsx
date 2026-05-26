import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Mic, 
  Search, 
  Check, 
  Trash2, 
  Filter, 
  X, 
  Clock,
  Zap,
  Lightbulb,
  FileText,
  AlertCircle,
  Archive,
  MoreVertical,
  Calendar,
  ChevronDown,
  Bell,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Square,
  CheckSquare,
  Palette,
  LayoutGrid,
  LayoutList,
  Edit2,
  LogIn,
  LogOut,
  User as UserIcon,
  Image as ImageIcon,
  Video,
  Paperclip,
  XCircle,
  PlayCircle,
  Crown,
  Settings as SettingsIcon,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { Capsule, FilterType, ReminderType, UserProfile } from './types';
import { PRESET_COLORS } from './constants';
import { categorizeThought } from './services/geminiService';
import { 
  db, 
  auth, 
  googleProvider, 
  appleProvider,
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
  doc
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Mail, Lock, CheckCircle2, ArrowRight, UserPlus, Apple, ExternalLink } from 'lucide-react';
import { cn } from './lib/utils';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

import { LandingPage } from './components/LandingPage';
import { AppLogo } from './components/AppLogo';
import { PremiumModal } from './components/PremiumModal';
import { SettingsModal } from './components/SettingsModal';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [demoCapsules, setDemoCapsules] = useState<Capsule[]>([]);
  const allCapsules = [...demoCapsules, ...capsules].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    (window as any)._setIsSidebarOpen = setIsSidebarOpen;
  }, [setIsSidebarOpen]);
  const [isListening, setIsListening] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [firedReminders, setFiredReminders] = useState<Capsule[]>([]);
  
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const seedDemoData = async () => {
    if (!user) return;
    setAuthProcessing(true);
    try {
      const generatedDemoCapsules: Capsule[] = [
        {
          id: 'demo-1',
          content: "🚀 Welcome to Lumi Note! This is a thought note to record your inspiration. It displays perfectly in both list and grid views.",
          category: "Technology",
          tags: ["intro", "welcome"],
          color: PRESET_COLORS[0],
          isTodo: false,
          completed: false,
          isArchived: false,
          isDeleted: false,
          attachments: [
            { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2664&auto=format&fit=crop", type: 'image' as const }
          ],
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
        },
        {
          id: 'demo-2',
          content: "🛒 Remember to buy milk and bread",
          category: "Personal",
          tags: ["shopping", "home"],
          color: PRESET_COLORS[1],
          isTodo: true,
          completed: false,
          isArchived: false,
          isDeleted: false,
          createdAt: Date.now() - 1000 * 60 * 60,
        },
        {
          id: 'demo-3',
          content: "🎯 Finish project presentation PPT",
          category: "Work",
          tags: ["important", "deadline"],
          color: PRESET_COLORS[2],
          isTodo: true,
          completed: true,
          isArchived: true,
          isDeleted: false,
          createdAt: Date.now() - 1000 * 60 * 60 * 5,
          updatedAt: Date.now() - 1000 * 60 * 30,
        },
        {
          id: 'demo-4',
          content: "💡 A crazy idea for a new App: AI-driven dream analyzer.",
          category: "Idea",
          tags: ["creative", "startup", "ai"],
          color: PRESET_COLORS[3],
          isTodo: false,
          completed: false,
          isArchived: false,
          isDeleted: false,
          createdAt: Date.now() - 1000 * 60 * 2,
        },
        {
          id: 'demo-5',
          content: "🗑️ This is an expired abandoned note, currently in the trash.",
          category: "Uncategorized",
          color: PRESET_COLORS[4],
          isTodo: false,
          completed: false,
          isArchived: false,
          isDeleted: true,
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
        },
        {
          id: 'demo-6',
          content: "⏰ Book tomorrow's dentist appointment",
          category: "Health",
          tags: ["appointment"],
          color: PRESET_COLORS[5],
          isTodo: true,
          completed: false,
          isArchived: false,
          isDeleted: false,
          reminder: { type: 'custom' as ReminderType, date: Date.now() + 86400000 },
          createdAt: Date.now(),
        },
        {
          id: 'demo-7',
          content: 'This is a completed todo item demo, visible in the "Completed To-do" view.',
          category: 'Personal',
          tags: ['demo', 'done'],
          color: '#434343',
          isTodo: true,
          completed: true,
          isArchived: false,
          isDeleted: false,
          createdAt: Date.now() - 172800000,
        },
        {
          id: 'demo-8',
          content: "📚 Read 'The Design of Everyday Things' Chapters 1-3",
          category: "Study",
          tags: ["reading", "design"],
          color: PRESET_COLORS[6] || '#AF52DE',
          isTodo: true,
          completed: false,
          isArchived: false,
          isDeleted: false,
          createdAt: Date.now() - 43200000,
        },
        {
          id: 'demo-9',
          content: "📞 Confirm next week's online meeting time with investors",
          category: "Work",
          tags: ["meeting", "important"],
          color: PRESET_COLORS[2],
          isTodo: true,
          completed: false,
          isArchived: false,
          isDeleted: false,
          reminder: { type: 'custom' as ReminderType, date: Date.now() + 86400000 * 2 },
          createdAt: Date.now() - 86400000,
        },
        {
          id: 'demo-10',
          content: "🎬 Recommended movies: Interstellar, Inception",
          category: "Entertainment",
          tags: ["movie", "weekend"],
          color: PRESET_COLORS[3],
          isTodo: false,
          completed: false,
          isArchived: false,
          isDeleted: false,
          createdAt: Date.now() - 172800000,
        },
        {
          id: 'demo-11',
          content: "✈️ Make travel plans for Kyoto, Japan at the end of the year: flights, hotels, visas",
          category: "Personal",
          tags: ["travel", "japan"],
          color: PRESET_COLORS[1],
          isTodo: true,
          completed: false,
          isArchived: false,
          isDeleted: false,
          createdAt: Date.now() - 259200000,
        },
        {
          id: 'demo-12',
          content: "💻 Optimize frontend first-screen loading speed, check Vite config and lazy loading",
          category: "Technology",
          tags: ["dev", "performance"],
          color: PRESET_COLORS[0],
          isTodo: true,
          completed: false,
          isArchived: false,
          isDeleted: false,
          createdAt: Date.now() - 1800000,
        }
      ];

      console.log('--- SEEDING DEMO DATA ---', generatedDemoCapsules);
      setDemoCapsules(generatedDemoCapsules);
    } catch (error) {
      console.error(error);
    } finally {
      setAuthProcessing(false);
    }
  };

  const [authError, setAuthError] = useState<string | null>(null);
  const [authProcessing, setAuthProcessing] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthProcessing(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: email.split('@')[0]
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Email already in use.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Password is too weak.');
      } else {
        setAuthError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setAuthProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError('Please enter your email first.');
      return;
    }
    setAuthProcessing(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setAuthError(null);
    } catch (err: any) {
      setAuthError('Could not send reset email.');
    } finally {
      setAuthProcessing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthProcessing(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Unauthorized Domain: Please add "luminote.space" and "thoughtisan.com" to your Firebase Console -> Authentication -> Settings -> Authorized Domains.');
      } else {
        setAuthError(err.message || 'Google Login failed. Please try again.');
      }
    } finally {
      setAuthProcessing(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    let userDocUnsubscribe: () => void;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        // Optimistic login: Immediately show app and use cached premium status to avoid screen flicker
        const cachedPremium = localStorage.getItem(`premium_${firebaseUser.uid}`) === 'true';
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isPremium: cachedPremium
        });
        setAuthLoading(false);

        // Listen to user document for premium status in background
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        userDocUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          const isPremium = docSnap.exists() ? (docSnap.data().isPremium || false) : false;
          localStorage.setItem(`premium_${firebaseUser.uid}`, String(isPremium));
          
          setUser(prev => prev ? {
            ...prev,
            displayName: docSnap.exists() ? docSnap.data().displayName || prev.displayName : prev.displayName,
            photoURL: docSnap.exists() ? docSnap.data().photoURL || prev.photoURL : prev.photoURL,
            isPremium
          } : {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isPremium
          });

          if (!docSnap.exists()) {
            // Initial sync
            setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isPremium: false,
              updatedAt: Date.now()
            }, { merge: true });
          }
        }, (error) => {
          console.error("user doc snapshot error", error);
        });
      } else {
        if (userDocUnsubscribe) {
          userDocUnsubscribe();
        }
        setUser(null);
        setCapsules([]);
        setDemoCapsules([]);
        setAuthLoading(false);
      }
    });
    return () => {
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
      unsubscribe();
    }
  }, []);

  // Firestore Sync Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'capsules'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ 
        ...(d.data() as Capsule),
        id: d.id 
      }));
      // Sort by createdAt descending locally
      console.log('--- FIRESTORE DATA LOADED ---', docs.length, 'items');
      setCapsules(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'capsules');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let wasMobile = window.innerWidth <= 768;
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && !wasMobile) {
        setIsSidebarOpen(false);
      } else if (!mobile && wasMobile) {
        setIsSidebarOpen(true);
      }
      wasMobile = mobile;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tourActive = useRef(false);

  useEffect(() => {
    if (!user || authLoading) return;
    
    (window as any).startTour = async () => {
      if (tourActive.current) return;
      tourActive.current = true;
      
      // Force filter to 'all' to ensure elements are visible
      setFilter('all');

      setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          overlayColor: 'rgba(0,0,0,0.5)',
          steps: [
            { 
              element: '#generate-demo-btn', 
              popover: { 
                title: '1. Generate Demo Data', 
                description: 'Click here to generate example notes and explore the app instantly.', 
                side: "bottom", 
                align: 'center' 
              } 
            },
            { 
              element: '#quick-capture-area', 
              popover: { 
                title: '2. Quick Capture', 
                description: 'Capture thoughts instantly. Use the text field or the mic button.', 
                side: "top", 
                align: 'center' 
              } 
            },
            { 
              element: '#capsule-options-btn-0', 
              popover: { 
                title: '3. Note Menu', 
                description: 'Click here to manage your note - change color, set reminders, or delete.', 
                side: "left", 
                align: 'center' 
              } 
            },
            { 
              element: '#capsule-item-0', 
              popover: { 
                title: '4. Bulk Select', 
                description: 'Long press any note to enter selection mode for bulk operations.', 
                side: "bottom", 
                align: 'center' 
              } 
            },
            { 
              element: '#view-mode-toggle', 
              popover: { 
                title: '5. Toggle Layout', 
                description: 'Switch between list and grid views to find your favorite layout.', 
                side: "bottom", 
                align: 'center' 
              } 
            }
          ],
          onDestroyed: () => {
            tourActive.current = false;
            localStorage.setItem('onboarding_v4_complete', 'true');
          }
        });

        driverObj.drive();
      }, 800); // Give enough time for DOM to update after seeding
    };

    const hasSeenTutorial = localStorage.getItem('onboarding_v4_complete');
    if (!hasSeenTutorial && !tourActive.current) {
       setTimeout(() => {
         if ((window as any).startTour && !tourActive.current) {
           (window as any).startTour();
         }
       }, 1500); // 1.5s delay for stable trigger
    }
  }, [user, authLoading, allCapsules.length]);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognition = useRef<any>(null);
  
  const allTags = Array.from(new Set(allCapsules.flatMap(c => c.tags || []))).sort();
  const allCategories = Array.from(new Set(allCapsules.map(c => c.category).filter(Boolean) as string[])).sort();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const batchUpdate = async (updates: Partial<Capsule>) => {
    if (!user) return;
    try {
      const demoIds = Array.from<string>(selectedIds).filter((id: string) => id.startsWith('demo-'));
      const realIds = Array.from<string>(selectedIds).filter((id: string) => !id.startsWith('demo-'));

      if (demoIds.length > 0) {
        setDemoCapsules(prev => prev.map(c => demoIds.includes(c.id) ? { ...c, ...updates, updatedAt: Date.now() } : c));
      }

      if (realIds.length > 0) {
        const batch = writeBatch(db);
        realIds.forEach((id: string) => {
          const docRef = doc(db, 'capsules', id);
          batch.update(docRef, { ...updates, updatedAt: Date.now() });
        });
        await batch.commit();
      }
      setSelectedIds(new Set());
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'capsules/batch');
    }
  };

  const batchRemovePermanently = async () => {
    if (!user) return;
    try {
      const demoIds = Array.from<string>(selectedIds).filter((id: string) => id.startsWith('demo-'));
      const realIds = Array.from<string>(selectedIds).filter((id: string) => !id.startsWith('demo-'));

      if (demoIds.length > 0) {
        setDemoCapsules(prev => prev.filter(c => !demoIds.includes(c.id)));
      }

      if (realIds.length > 0) {
        const batch = writeBatch(db);
        realIds.forEach((id: string) => {
          const docRef = doc(db, 'capsules', id);
          batch.delete(docRef);
        });
        await batch.commit();
      }
      setSelectedIds(new Set());
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'capsules/batch');
    }
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition.current = new (window as any).webkitSpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputText(transcript);
          handleCreateCapsule(transcript);
        }
        setIsListening(false);
      };

      recognition.current.onerror = () => setIsListening(false);
      recognition.current.onend = () => setIsListening(false);
    }
  }, []);

  const [editingCapsule, setEditingCapsule] = useState<Capsule | null>(null);

  const clearAllData = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete ALL your data? This cannot be undone.')) return;
    
    setAuthProcessing(true);
    try {
      const q = query(collection(db, 'capsules'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setCapsules([]);
      setDemoCapsules([]);
      alert('All data has been cleared.');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data.');
    } finally {
      setAuthProcessing(false);
      setShowSettingsModal(false);
    }
  };

  const handleCreateCapsule = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setInputText('');
    
    // Immediately focus back to input for potential next input
    inputRef.current?.focus();
    
    try {
      const { category, tags, refinedContent, isTodo, reminder } = await categorizeThought(text);
      
      // Select a random color from PRESET_COLORS
      const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
      
      const newCapsuleData = {
        userId: user?.uid,
        content: refinedContent,
        category: category || undefined,
        tags: tags && tags.length > 0 ? tags : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(), // Added for float-to-top
        completed: false,
        isTodo: isTodo ?? false,
        isArchived: false,
        isDeleted: false,
        reminder,
        color: randomColor
      };
      
      await addDoc(collection(db, 'capsules'), newCapsuleData);
    } catch (error) {
      const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
      try {
        await addDoc(collection(db, 'capsules'), {
          userId: user?.uid,
          content: text,
          createdAt: Date.now(),
          updatedAt: Date.now(), // Added for float-to-top
          completed: false,
          isTodo: false,
          isArchived: false,
          isDeleted: false,
          color: randomColor
        });
      } catch (innerError) {
        handleFirestoreError(innerError, OperationType.CREATE, 'capsules');
      }
    } finally {
      setIsProcessing(false);
      // Ensure focus again just in case
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const updateCapsule = async (id: string, updates: Partial<Capsule>) => {
    if (!user) return;
    const now = Date.now();
    
    // Sync with editing state if this is the one being edited
    if (editingCapsule?.id === id) {
      setEditingCapsule(prev => prev ? { ...prev, ...updates, updatedAt: now } : null);
    }

    if (id.startsWith('demo-')) {
      setDemoCapsules(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: now } : c));
      return;
    }
    try {
      const docRef = doc(db, 'capsules', id);
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanUpdates[key] = value;
        } else {
          cleanUpdates[key] = null;
        }
      });
      await updateDoc(docRef, { ...cleanUpdates, updatedAt: now });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `capsules/${id}`);
    }
  };

  const handleAttachMedia = (e: React.ChangeEvent<HTMLInputElement>, capsule: Capsule) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    
    if (!user?.isPremium && (file.size > 5 * 1024 * 1024 || isVideo)) {
       alert("Large images (>5MB) and video uploads require Lumi Note Pro.");
       setShowPremiumModal(true);
       return;
    }
    
    if (file.size > 800 * 1024 || isVideo) {
      const url = URL.createObjectURL(file);
      const newAttachments = [...(capsule.attachments || []), { url, type: (isVideo ? 'video' : 'image') as 'video' | 'image' }];
      updateCapsule(capsule.id, { attachments: newAttachments });
      if (editingCapsule?.id === capsule.id) {
        setEditingCapsule({ ...editingCapsule, attachments: newAttachments });
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (ee) => {
      const dataUrl = ee.target?.result as string;
      const newAttachments = [...(capsule.attachments || []), { url: dataUrl, type: 'image' as const }];
      updateCapsule(capsule.id, { attachments: newAttachments });
      if (editingCapsule?.id === capsule.id) {
        setEditingCapsule({ ...editingCapsule, attachments: newAttachments });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (capsule: Capsule, index: number) => {
    const newAttachments = [...(capsule.attachments || [])];
    newAttachments.splice(index, 1);
    updateCapsule(capsule.id, { attachments: newAttachments });
    if (editingCapsule?.id === capsule.id) {
      setEditingCapsule({ ...editingCapsule, attachments: newAttachments });
    }
  };

  const removeCapsuleForever = async (id: string) => {
    if (!user) return;
    if (id.startsWith('demo-')) {
      setDemoCapsules(prev => prev.filter(c => c.id !== id));
      return;
    }
    try {
      const docRef = doc(db, 'capsules', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `capsules/${id}`);
    }
  };

  const startListening = () => {
    if (!user?.isPremium) {
       alert("Unlimited Voice Transcription requires Lumi Note Pro.");
       setShowPremiumModal(true);
       return;
    }
    if (recognition.current) {
      try {
        setIsListening(true);
        recognition.current.start();
      } catch (e) {
        console.log("Already dictating");
      }
    } else {
      alert('Your browser does not support speech recognition.');
    }
  };

  const stopListening = () => {
    if (recognition.current && isListening) {
      recognition.current.stop();
    }
  };

  const renameCategory = (oldCat: string) => {
    const newCat = prompt('Rename category:', oldCat);
    if (newCat && newCat.trim() && newCat !== oldCat) {
      allCapsules.forEach(c => {
        if (c.category === oldCat) {
          updateCapsule(c.id, { category: newCat.trim() });
        }
      });
      if (categoryFilter === oldCat) setCategoryFilter(newCat.trim());
    }
  };

  const renameTag = (oldTag: string) => {
    const newTag = prompt('Rename tag:', oldTag);
    if (newTag && newTag.trim() && newTag !== oldTag) {
      const trimmed = newTag.trim().replace('#', '');
      allCapsules.forEach(c => {
        if (c.tags?.includes(oldTag)) {
          updateCapsule(c.id, { tags: c.tags.map(t => t === oldTag ? trimmed : t) });
        }
      });
      if (tagFilter === oldTag) setTagFilter(trimmed);
    }
  };

  const removeCategory = (catToRemove: string) => {
    if (confirm(`This will delete all notes in this category.`)) {
      allCapsules.forEach(c => {
        if (c.category === catToRemove) {
          removeCapsuleForever(c.id);
        }
      });
      if (categoryFilter === catToRemove) setCategoryFilter('all');
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (confirm(`This will delete all notes with this tag.`)) {
      allCapsules.forEach(c => {
        if (c.tags?.includes(tagToRemove)) {
          removeCapsuleForever(c.id);
        }
      });
      if (tagFilter === tagToRemove) setTagFilter(null);
    }
  };

  // Real Reminder Engine
  useEffect(() => {
    if (user?.isPremium && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const interval = setInterval(() => {
      const now = Date.now();
      allCapsules.forEach(cap => {
        if (cap.reminder && cap.reminder.date && cap.reminder.date <= now && !cap.completed && !cap.isDeleted && !cap.isArchived) {
          
          const isAlreadyFired = firedReminders.some(f => f.id === cap.id);
          if (!isAlreadyFired) {
            console.log('--- REMINDER FIRED ---', cap.id);
            setFiredReminders(prev => [...prev, cap]);
            
            // Play notification sound
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log('Audio play blocked by browser policy'));
            } catch (e) {
              console.error('Failed to play reminder sound', e);
            }
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Lumi Note Reminder', {
                body: cap.content.substring(0, 50) + (cap.content.length > 50 ? '...' : ''),
              });
            }
          }
          
          let nextReminder = { ...cap.reminder };
          let shouldUpdate = false;

          // Only auto-advance repeating reminders, leave 'once' alone so it shows as overdue
          if (cap.reminder.type === 'custom' && cap.reminder.customInterval) {
             const multiplier = cap.reminder.customUnit === 'day' ? 86400000 : cap.reminder.customUnit === 'week' ? 604800000 : 2592000000;
             nextReminder.date = now + cap.reminder.customInterval * multiplier;
             shouldUpdate = true;
          } else if (cap.reminder.type === 'daily') {
            nextReminder.date = now + 86400000;
            shouldUpdate = true;
          } else if (cap.reminder.type === 'monthly') {
            const nextDate = new Date(now);
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextReminder.date = nextDate.getTime();
            shouldUpdate = true;
          } else if (cap.reminder.type === 'yearly') {
            const nextDate = new Date(now);
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            nextReminder.date = nextDate.getTime();
            shouldUpdate = true;
          }

          if (shouldUpdate) {
             updateCapsule(cap.id, { reminder: nextReminder as any });
          }
        }
      });
    }, 10000); // Check every 10s
    
    return () => clearInterval(interval);
  }, [allCapsules]);

  const sortedCapsules = [...allCapsules].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  
  const filteredCapsules = sortedCapsules.filter(c => {
    const matchesSearch = c.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (c.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesTag = !tagFilter || (c.tags && c.tags.includes(tagFilter));
    
    // Hard state filters (Archive/Trash)
    if (filter === 'archived') return matchesSearch && matchesCategory && matchesTag && c.isArchived && !c.isDeleted;
    if (filter === 'trash') return matchesSearch && matchesCategory && matchesTag && c.isDeleted;
    
    // Normal view: don't show archived or deleted
    if (c.isArchived || c.isDeleted) return false;

    // Advanced filters
    const matchesAdvanced = (() => {
      switch (filter) {
        case 'with-todo': return c.isTodo;
        case 'without-todo': return !c.isTodo;
        case 'completed-todo': return c.isTodo && c.completed;
        case 'with-reminder': return !!c.reminder && c.reminder.type !== 'none';
        case 'without-reminder': return !c.reminder || c.reminder.type === 'none';
        default: return true;
      }
    })();

    return matchesSearch && matchesCategory && matchesTag && matchesAdvanced;
  });

  const filterOptions: { value: FilterType, label: string }[] = [
    { value: 'all', label: 'All Notes' },
    { value: 'with-todo', label: 'Has To-do' },
    { value: 'without-todo', label: 'No To-do' },
    { value: 'completed-todo', label: 'Done To-do' },
    { value: 'with-reminder', label: 'Has Reminder' },
    { value: 'without-reminder', label: 'No Reminder' },
    { value: 'archived', label: 'Archived' },
    { value: 'trash', label: 'Trash' },
  ];

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
          <Zap size={48} className="text-[#007AFF]" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    if (!showAuthScreen) {
      return <LandingPage onLogin={() => setShowAuthScreen(true)} />;
    }

    return (
      <div id="login-screen" className="h-[100dvh] w-screen flex flex-col md:flex-row bg-white overflow-hidden">
        {/* Back button */}
        <button 
          onClick={() => setShowAuthScreen(false)}
          className="absolute top-6 left-6 z-50 w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors"
        >
          <ArrowRight size={20} className="rotate-180" />
        </button>
        {/* Left Design Section */}
        <div className="hidden md:flex flex-1 bg-[#F2F2F7] flex-col items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#007AFF] opacity-5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00C6FF] opacity-5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-sm"
          >
            <div className="w-24 h-24 mb-12 transform -rotate-6">
              <AppLogo className="w-full h-full" />
            </div>
            <h2 className="text-5xl font-black tracking-tight text-[#1D1D1F] leading-tight mb-6">
              Capturing<br />
              <span className="text-[#007AFF]">Genius</span><br />
              Thoughts.
            </h2>
            <div className="space-y-4">
               {['AI Powered Intelligence', 'Idea Sync', 'Swiss Aesthetics'].map((feat) => (
                 <div key={feat} className="flex items-center gap-3 text-[#8E8E93] font-bold">
                   <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                     <div className="w-2 h-2 bg-[#007AFF] rounded-full"></div>
                   </div>
                   {feat}
                 </div>
               ))}
            </div>
          </motion.div>
        </div>

        {/* Right Auth Section */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-sm">
            <div className="md:hidden flex flex-col items-center mb-12">
              <AppLogo className="w-20 h-20 mb-4" />
              <h1 className="text-2xl font-black text-center">Idea<br />Capsule</h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-2xl font-bold text-[#1D1D1F] mb-2">{isRegistering ? 'Create Account' : 'Welcome Back'}</h3>
              <p className="text-[#8E8E93] text-sm font-semibold mb-8">
                {isRegistering ? 'Start your idea journey today.' : 'Sign in to sync your capsules.'}
              </p>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-[#8E8E93] uppercase tracking-widest mb-2 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]" size={18} />
                    <input 
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-[#F2F2F7] border-2 border-transparent focus:border-[#007AFF] focus:bg-white rounded-2xl text-sm font-semibold transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#8E8E93] uppercase tracking-widest mb-2 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]" size={18} />
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-[#F2F2F7] border-2 border-transparent focus:border-[#007AFF] focus:bg-white rounded-2xl text-sm font-semibold transition-all outline-none"
                    />
                  </div>
                </div>

                {authError && (
                  <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-4 rounded-2xl">
                    <AlertCircle size={14} className="shrink-0" />
                    {authError}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={authProcessing}
                  className="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-[#007AFF]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {authProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (isRegistering ? 'Create Account' : 'Sign In')}
                </button>
              </form>

              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E5E5EA]"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black text-[#8E8E93]"><span className="bg-white px-4 tracking-widest">Or social sign in</span></div>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 bg-white py-3 rounded-xl border border-[#E5E5EA] hover:bg-[#F2F2F7] transition-all active:scale-95 shadow-sm font-bold text-sm text-[#1D1D1F]"
                  title="Sign in with Google"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  <span>Google</span>
                </button>
              </div>

              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="w-full text-center mt-12 text-xs font-bold text-[#8E8E93]"
              >
                {isRegistering ? 'Already have an account?' : "Don't have an account?"} <span className="text-[#007AFF]">{isRegistering ? 'Sign In' : 'Sign Up'}</span>
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="app-container" className="flex h-[100dvh] bg-[#F8F9FA] text-[#1D1D1F] font-sans overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
      </AnimatePresence>

      {/* Sidebar - Category Filter */}
      <motion.aside 
        id="sidebar"
        initial={isMobile ? { x: -200 } : false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? 150 : 160) : (isMobile ? 0 : 0),
          x: isMobile && !isSidebarOpen ? -150 : 0,
          opacity: isSidebarOpen ? 1 : 0
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`bg-white border-r border-[#E5E5EA] flex flex-col items-stretch shadow-xl md:shadow-none z-50 fixed md:relative h-full ${!isSidebarOpen ? 'invisible border-none overflow-hidden' : 'visible'}`}
      >
        <div className="p-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center drop-shadow-md">
              <AppLogo className="w-full h-full" />
            </div>
            {isSidebarOpen && <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#1D1D1F] to-[#434343] whitespace-nowrap">Lumi Note</span>}
          </div>
          {isSidebarOpen && (
            <button 
              id="sidebar-toggle"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 hover:bg-[#F2F2F7] rounded-lg transition-colors text-[#8E8E93] group"
            >
              <ChevronLeft size={20} className="group-hover:text-[#007AFF] transition-colors" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem 
            id="cat-all"
            icon={null} 
            label="All" 
            isActive={categoryFilter === 'all' && !tagFilter} 
            onClick={() => { 
              setCategoryFilter('all'); 
              setTagFilter(null); 
              if (isMobile) setIsSidebarOpen(false);
            }}
            isSidebarOpen={isSidebarOpen}
          />
          
          {allCategories.length > 0 && isSidebarOpen && (
            <>
              <div 
                className="mt-4 mb-1 px-2 text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest flex items-center justify-between cursor-pointer hover:bg-[#F2F2F7] py-1.5 rounded-lg transition-colors"
                onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📂</span> Categories
                </div>
                <ChevronRight size={14} className={`transition-transform flex-shrink-0 ${isCategoriesExpanded ? 'rotate-90' : ''}`} />
              </div>
              <div className={`overflow-hidden transition-all duration-200 ${isCategoriesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {allCategories.map((cat) => {
                  return (
                    <SidebarItem 
                      key={`cat-${cat}`}
                      id={`cat-${cat}`}
                      icon={null} 
                      label={cat} 
                      isActive={categoryFilter === cat} 
                      onClick={() => { 
                        setCategoryFilter(categoryFilter === cat ? 'all' : cat); 
                        setTagFilter(null); 
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                      onRename={(newName) => {
                        setCapsules(prev => prev.map(c => c.category === cat ? { ...c, category: newName } : c));
                        if (categoryFilter === cat) setCategoryFilter(newName);
                      }}
                      onDelete={() => {
                        setCapsules(prev => prev.filter(c => c.category !== cat));
                        if (categoryFilter === cat) setCategoryFilter('all');
                      }}
                      isSidebarOpen={isSidebarOpen}
                      isCustom={true}
                    />
                  )
                })}
              </div>
            </>
          )}

          {allTags.length > 0 && isSidebarOpen && (
            <>
              <div 
                className="mt-4 mb-1 px-2 text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest flex items-center justify-between cursor-pointer hover:bg-[#F2F2F7] py-1.5 rounded-lg transition-colors"
                onClick={() => setIsTagsExpanded(!isTagsExpanded)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🏷️</span> Tags
                </div>
                <ChevronRight size={14} className={`transition-transform flex-shrink-0 ${isTagsExpanded ? 'rotate-90' : ''}`} />
              </div>
              <div className={`overflow-hidden transition-all duration-200 space-y-1 ${isTagsExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {allTags.map((tag) => {
                  return (
                    <TagItem 
                      key={tag}
                      tag={tag}
                      tagFilter={tagFilter}
                      setTagFilter={setTagFilter}
                      setCategoryFilter={setCategoryFilter}
                      removeTag={removeTag}
                      isMobile={isMobile}
                      setIsSidebarOpen={setIsSidebarOpen}
                      onRename={(oldTag: string, newTag: string) => {
                        setCapsules(prev => prev.map(c => {
                          if (c.tags?.includes(oldTag)) {
                            return { ...c, tags: c.tags.map(t => t === oldTag ? newTag : t) };
                          }
                          return c;
                        }));
                        if (tagFilter === oldTag) setTagFilter(newTag);
                      }}
                    />
                  )
                })}
              </div>
            </>
          )}
        </nav>

        {isSidebarOpen && !localStorage.getItem('onboarding_v4_complete') && (
          <div className="px-3 pb-3">
             <button 
                onClick={() => {
                   localStorage.removeItem('onboarding_v4_complete');
                   if ((window as any).startTour) {
                     (window as any).startTour();
                   } else {
                     window.location.reload();
                   }
                }}
                className="w-full flex items-center justify-start gap-2 p-2.5 px-4 text-xs font-bold text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#007AFF]/10 rounded-xl transition-all"
             >
                <Lightbulb size={14} />
                Onboarding
             </button>
          </div>
        )}

        {/* User Card */}
        <div className="mt-auto p-3 border-t border-[#E5E5EA] flex flex-col gap-2">
           <div className="bg-[#F2F2F7] rounded-2xl p-3 flex items-center gap-3 group">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-xl shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 bg-[#007AFF] text-white rounded-xl flex items-center justify-center">
                   <UserIcon size={20} />
                </div>
              )}
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-bold truncate">{user.displayName || 'User'}</p>
                    {user.isPremium && (
                       <span className="flex items-center gap-0.5 bg-gradient-to-r from-[#AF52DE] to-[#FF2D55] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm">
                         <Crown size={10} /> Pro
                       </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button 
                      onClick={() => signOut(auth)}
                      className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:opacity-70 transition-opacity flex items-center gap-1"
                    >
                      <LogOut size={10} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
           </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main 
        id="main-content" 
        className="flex-1 flex flex-col relative h-full min-w-0 min-h-0 overflow-x-hidden"
        onClick={() => {
          if (selectedIds.size > 0) {
            setSelectedIds(new Set());
          }
        }}
      >
        {/* Header / Search & Adv Filter */}
        <header className="h-16 px-4 md:px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-[#E5E5EA] gap-4 z-40 sticky top-0">
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-2xl">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 hover:bg-[#F2F2F7] border border-[#E5E5EA] shadow-sm bg-white rounded-xl text-[#007AFF] transition-all flex items-center justify-center shrink-0 active:scale-95"
              >
                <ChevronRight size={24} />
              </button>
            )}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" size={18} />
              <input 
                id="search-input"
                type="text" 
                placeholder="Search all ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F2F2F7] border-2 border-transparent rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:bg-white focus:border-[#007AFF]/20 focus:ring-4 focus:ring-[#007AFF]/5 transition-all"
              />
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2 relative">
            {!user.isPremium && (
               <button 
                  onClick={() => setShowPremiumModal(true)} 
                  className="flex bg-gradient-to-r from-[#AF52DE] to-[#FF2D55] text-white px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl text-[13px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 uppercase items-center gap-1.5"
               >
                 <Crown size={16} className="md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">Upgrade</span>
               </button>
            )}
            <button
              id="settings-btn"
              onClick={() => setShowSettingsModal(true)}
              className="flex w-10 h-10 items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F2F2F7] rounded-xl hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
            >
              <SettingsIcon size={20} />
            </button>
            <button
              id="view-mode-toggle"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="flex w-10 h-10 items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F2F2F7] rounded-xl hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
            >
              {viewMode === 'grid' ? <LayoutList size={20} /> : <LayoutGrid size={20} />}
            </button>
            <button 
              id="filter-dropdown-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsFilterMenuOpen(!isFilterMenuOpen);
              }}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 flex-shrink-0 bg-white shadow-sm border border-[#E5E5EA] rounded-full text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7] transition-all active:scale-95"
            >
              <span className="truncate max-w-[80px] sm:max-w-none">{filterOptions.find(o => o.value === filter)?.label}</span>
              <ChevronDown size={14} className={`flex-shrink-0 text-[#8E8E93] transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isFilterMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white/90 backdrop-blur-xl border border-white/20 rounded-[18px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 p-2"
                  >
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setFilter(opt.value);
                          setIsFilterMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                          filter === opt.value 
                            ? 'bg-[#E5E5EA] text-[#1D1D1F]' 
                            : 'hover:bg-[#F2F2F7] text-[#1D1D1F]'
                        }`}
                      >
                        {opt.label}
                        {filter === opt.value && <Check size={14} className="text-[#007AFF]" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Capsule List */}
        <div id="scroll-container" className="flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-8 custom-scrollbar scroll-smooth">
          <div className={`w-full mx-auto pb-48 transition-all duration-300 ${
            selectedIds.size > 0 ? 'mt-4' : ''
          } ${
            viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-2.5 md:gap-5 auto-rows-auto' 
              : 'w-full max-w-[1400px] px-1 md:px-0 mx-auto flex flex-col space-y-3 md:space-y-4'
          }`}>
            <AnimatePresence initial={false}>
              {filteredCapsules.map((capsule, index) => (
                <CapsuleItem 
                  key={capsule.id} 
                  capsule={capsule}
                  index={index}
                  viewMode={viewMode}
                  onUpdate={(updates) => updateCapsule(capsule.id, updates)}
                  onRemovePermanently={() => removeCapsuleForever(capsule.id)}
                  allCategories={allCategories}
                  isSelectionMode={selectedIds.size > 0}
                  isSelected={selectedIds.has(capsule.id)}
                  onToggleSelection={() => toggleSelection(capsule.id)}
                  onViewDetail={() => setEditingCapsule(capsule)}
                  isPremium={user?.isPremium || false}
                />
              ))}
            </AnimatePresence>
            
            {filteredCapsules.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-[#8E8E93]">
                <div className="w-16 h-16 bg-[#E5E5EA] rounded-full flex items-center justify-center mb-4">
                  <Plus size={32} />
                </div>
                <p className="text-sm font-medium mb-4">No capsules found in this view.</p>
                <div className="flex gap-3">
                  <button 
                    id="generate-demo-btn"
                    onClick={seedDemoData}
                    disabled={authProcessing}
                    className="px-6 py-3 bg-[#007AFF] text-white rounded-2xl font-bold text-sm hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 group"
                  >
                    <Zap size={16} className={authProcessing ? 'animate-spin' : 'group-hover:animate-pulse'} />
                    {authProcessing ? 'Generating...' : 'Generate Demo Data'}
                  </button>
                  {filter !== 'all' && (
                     <button 
                      onClick={() => setFilter('all')}
                      className="px-6 py-3 bg-[#F2F2F7] text-[#1D1D1F] rounded-2xl font-bold text-sm hover:bg-[#E5E5EA] transition-all"
                    >
                      Show All
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Capsule Detail Modal */}
        <AnimatePresence>
          {editingCapsule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingCapsule(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              >
                {/* Header colored bar */}
                <div 
                  className="h-16 w-full flex items-center justify-between px-6"
                  style={{ backgroundColor: editingCapsule.color || '#F2F2F7', color: editingCapsule.color === '#F2F2F7' ? '#1D1D1F' : 'white' }}
                >
                  <span className="font-bold tracking-tight text-lg">Edit Capsule</span>
                  <button 
                    onClick={() => setEditingCapsule(null)}
                    className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
                  {editingCapsule.attachments && editingCapsule.attachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {editingCapsule.attachments.map((att, idx) => (
                        <div key={idx} className="relative group rounded-2xl overflow-hidden border border-[#E5E5EA] bg-black/5 aspect-video flex-shrink-0">
                          {att.type === 'video' ? (
                            <video src={att.url} className="w-full h-full object-cover" controls />
                          ) : (
                            <img src={att.url} alt="Attachment" className="w-full h-full object-cover" />
                          )}
                          <button 
                            onClick={() => removeAttachment(editingCapsule, idx)}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea 
                    value={editingCapsule.content}
                    onChange={(e) => updateCapsule(editingCapsule.id, { content: e.target.value })}
                    className="w-full min-h-[150px] flex-1 text-xl md:text-2xl font-medium text-[#1C1C1E] bg-transparent border-none focus:ring-0 resize-none leading-relaxed placeholder:text-[#C7C7CC] placeholder:font-normal"
                    placeholder="Type your brilliant thought here..."
                    autoFocus
                  />
                  
                  <div className="mt-8 flex flex-wrap gap-2">
                    {editingCapsule.tags?.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-[#F2F2F7] rounded-full text-xs font-bold text-[#8E8E93] tracking-tight">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 md:p-6 bg-[#F8F9FA] border-t border-[#E5E5EA] flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer p-2 text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] rounded-xl transition-all flex hidden md:flex items-center gap-2">
                      <ImageIcon size={20} />
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleAttachMedia(e, editingCapsule)} />
                    </label>
                    <label className="cursor-pointer md:hidden p-2 text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] rounded-xl transition-all">
                      <Paperclip size={20} />
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleAttachMedia(e, editingCapsule)} />
                    </label>
                    <span className="text-xs text-[#8E8E93] font-medium">
                      {new Date(editingCapsule.createdAt).toLocaleDateString()} {new Date(editingCapsule.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => setEditingCapsule(null)}
                    className="px-8 py-3 bg-[#1D1D1F] text-white rounded-xl text-base font-bold shadow-lg hover:bg-black hover:scale-105 transition-all"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* In-App Reminders (Pro feature) */}
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[200] flex flex-col gap-2 pointer-events-none w-full max-w-sm">
          <AnimatePresence>
            {firedReminders.map(rem => (
              <motion.div 
                key={rem.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-6 border-2 border-[#007AFF]/20 flex items-start gap-4 pointer-events-auto w-full mb-2"
              >
                 <div className="bg-[#007AFF] text-white p-3.5 rounded-2xl shadow-lg shadow-[#007AFF]/30 mt-0.5">
                   <Bell className="animate-bounce" size={26} />
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest">System Alert</span>
                     <div className="w-1 h-1 rounded-full bg-[#8E8E93]"></div>
                     <span className="text-[10px] font-bold text-[#8E8E93]">Just now</span>
                   </div>
                   <h4 className="font-black text-lg text-[#1D1D1F] dark:text-[#F2F2F7] leading-tight mb-2">Reminder: Lumi Note</h4>
                   <p className="text-sm font-medium text-[#48484A] dark:text-[#8E8E93] line-clamp-3 leading-relaxed mb-4">{rem.content}</p>
                   
                   <div className="flex gap-2">
                     <button 
                        onClick={() => setFiredReminders(prev => prev.filter(p => p.id !== rem.id))}
                        className="flex-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F2F2F7] py-3 rounded-xl text-xs font-bold hover:bg-[#E5E5EA] transition-colors"
                     >
                        Dismiss
                     </button>
                     <button 
                        onClick={() => {
                           setFilter('all');
                           setSearchQuery(rem.content);
                           setFiredReminders(prev => prev.filter(p => p.id !== rem.id));
                        }}
                        className="flex-1 bg-[#007AFF] text-white py-3 rounded-xl text-xs font-bold hover:bg-[#0062CC] transition-colors shadow-lg shadow-[#007AFF]/20"
                     >
                        View Note
                     </button>
                   </div>
                 </div>
                 <button onClick={() => setFiredReminders(prev => prev.filter(p => p.id !== rem.id))} className="text-[#8E8E93] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] p-2 rounded-full transition-colors shrink-0">
                   <X size={20} />
                 </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Batch Actions Overlay */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-4 md:right-8 top-24 z-[100] pointer-events-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-stretch py-2 bg-white/90 backdrop-blur-3xl border border-[#E5E5EA] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl pointer-events-auto w-32 md:w-40 overflow-hidden">
                <span className="font-black text-[#1D1D1F] text-xs px-3 pb-2 border-b border-[#E5E5EA] w-full">{selectedIds.size} Selected</span>
                
                <button onClick={() => {
                  if (selectedIds.size === filteredCapsules.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(filteredCapsules.map(c => c.id)));
                  }
                }} className="flex items-center gap-2 px-3 py-2.5 text-[#007AFF] hover:bg-[#F2F2F7] transition-colors mt-1 w-full text-left">
                  <CheckSquare size={16} className="shrink-0" />
                  <span className="text-xs font-medium truncate">{selectedIds.size === filteredCapsules.length ? 'Deselect All' : 'Select All'}</span>
                </button>
                
                {filter === 'archived' ? (
                  <>
                    <button onClick={() => batchUpdate({ isArchived: false })} className="flex items-center gap-2 px-3 py-2.5 text-[#4CAF50] hover:bg-[#F2F2F7] transition-colors w-full text-left"><RotateCcw size={16} className="shrink-0" /><span className="text-xs font-medium">Restore</span></button>
                    <button onClick={() => batchUpdate({ isDeleted: true })} className="flex items-center gap-2 px-3 py-2.5 text-[#FF3B30] hover:bg-[#F2F2F7] transition-colors w-full text-left"><Trash2 size={16} className="shrink-0" /><span className="text-xs font-medium">Delete</span></button>
                  </>
                ) : filter === 'trash' ? (
                  <>
                    <button onClick={() => batchUpdate({ isDeleted: false })} className="flex items-center gap-2 px-3 py-2.5 text-[#4CAF50] hover:bg-[#F2F2F7] transition-colors w-full text-left"><RotateCcw size={16} className="shrink-0" /><span className="text-xs font-medium">Restore</span></button>
                    <button onClick={() => {
                      if (confirm('Are you sure you want to permanently delete the selected notes? This cannot be undone.')) {
                        batchRemovePermanently();
                      }
                    }} className="flex items-center gap-2 px-3 py-2.5 text-[#FF3B30] hover:bg-[#F2F2F7] transition-colors w-full text-left"><Trash2 size={16} className="shrink-0" /><span className="text-xs font-medium">Delete Forever</span></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => batchUpdate({ isArchived: true })} className="flex items-center gap-2 px-3 py-2.5 text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors w-full text-left"><Archive size={16} className="shrink-0" /><span className="text-xs font-medium">Archive</span></button>
                    <button onClick={() => batchUpdate({ isDeleted: true })} className="flex items-center gap-2 px-3 py-2.5 text-[#FF3B30] hover:bg-[#F2F2F7] transition-colors w-full text-left"><Trash2 size={16} className="shrink-0" /><span className="text-xs font-medium">Delete</span></button>
                  </>
                )}

                <div className="h-px bg-[#E5E5EA] w-full my-1" />
                <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-2 px-3 py-2.5 text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors w-full text-left"><X size={16} className="shrink-0" /><span className="text-xs font-medium">Cancel</span></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Improved Quick Capture Input Area */}
        <footer id="input-area" className={`shrink-0 min-h-[80px] md:h-32 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-[#E5E5EA] dark:border-white/10 px-4 md:px-8 py-3 md:py-4 flex items-center justify-center relative z-40 transition-opacity duration-300 ${selectedIds.size > 0 ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div 
            id="quick-capture-area"
            className="flex items-center w-full max-w-3xl gap-2 md:gap-4 flex-nowrap bg-white/50 dark:bg-black/20 p-2 rounded-[32px] border border-white/20 shadow-sm"
          >
             <div className={`flex-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[24px] min-h-[56px] flex items-center px-5 transition-all border-2 border-transparent ${isListening ? 'border-red-400 ring-8 ring-red-50' : 'focus-within:border-[#007AFF]/20 focus-within:bg-white dark:focus-within:bg-[#3A3A3C] focus-within:shadow-2xl'}`}>
                <div className="text-[#007AFF] mr-3 shrink-0">
                   <Zap size={22} strokeWidth={2.5} />
                </div>
                <input 
                  id="thought-input"
                  ref={inputRef}
                  type="text" 
                  placeholder={isListening ? "Listening..." : "Record your thoughts..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputText.trim()) {
                      handleCreateCapsule(inputText);
                      setInputText('');
                    }
                  }}
                  disabled={isProcessing}
                  className="bg-transparent border-none focus:ring-0 flex-1 text-base md:text-lg placeholder-[#8E8E93] dark:text-[#F2F2F7] outline-none py-3"
                />
                {(inputText.trim() || isProcessing) && (
                  <button 
                    onClick={() => { handleCreateCapsule(inputText); setInputText(''); }}
                    className="text-[#007AFF] p-2 hover:scale-110 active:scale-90 transition-all font-bold"
                  >
                    {isProcessing ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><RotateCcw size={20} /></motion.div> : <Plus size={28} strokeWidth={3} />}
                  </button>
                )}
             </div>

             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onMouseDown={startListening}
               onMouseUp={stopListening}
               onTouchStart={startListening}
               onTouchEnd={stopListening}
               className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-2xl shrink-0 ${isListening ? 'bg-red-500 ring-8 ring-red-100' : 'bg-gradient-to-br from-[#007AFF] to-[#00C6FF]'}`}
             >
               {isListening ? (
                 <div className="flex gap-1 items-center">
                   <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-white rounded-full" />
                   <motion.div animate={{ height: [12, 30, 12] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-white rounded-full" />
                   <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-white rounded-full" />
                 </div>
               ) : (
                 <Mic size={28} className="text-white" />
               )}
             </motion.button>
          </div>
        </footer>
      </main>
      
      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
        user={user}
        onSuccess={() => {
           setShowPremiumModal(false);
           alert("Payment successful! You are now an Lumi Note Pro member.");
           setDoc(doc(db, 'users', user?.uid), { isPremium: true }, { merge: true });
        }}
      />
      
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        onUpgradeClick={() => {
           setShowSettingsModal(false);
           setShowPremiumModal(true);
        }}
        onDowngradeClick={() => {
           if (user?.uid) {
             setDoc(doc(db, 'users', user.uid), { isPremium: false }, { merge: true });
             alert('You have successfully downgraded from Pro mode.');
             setShowSettingsModal(false);
           }
        }}
      />

      {/* Edge Swipe Panel Trigger (Mock Implementation for Edge Panel) */}
      {user?.isPremium && (
         <div 
           className="fixed right-0 top-1/2 -translate-y-1/2 w-2 h-24 bg-[#007AFF]/20 hover:bg-[#007AFF] hover:w-6 hover:h-48 group transition-all duration-300 rounded-l-2xl z-50 flex items-center justify-start cursor-pointer shadow-lg backdrop-blur-md"
           onClick={() => {
              // Trigger quick input focus and open sidebar or directly trigger listening
              if (!isListening) startListening();
           }}
           title="Edge Swipe (Pro) - Quick Recording"
         >
           <Mic size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
         </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D1D1D6; border-radius: 99px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #AEAEB2; }
      `}</style>
    </div>
  );
}

function SidebarItem({ 
  id, 
  icon, 
  label, 
  isActive, 
  onClick, 
  onRename,
  onDelete,
  isSidebarOpen,
  isCustom = false
}: { 
  key?: string | number;
  id?: string;
  icon?: React.ReactNode; 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  isSidebarOpen: boolean;
  isCustom?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    if (editValue.trim() && editValue !== label) {
      onRename?.(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setEditValue(label);
      setIsEditing(false);
    }
  };

  if (isConfirmingDelete) {
    return (
      <div className="px-3 py-2 mb-1 bg-red-50 rounded-2xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-right-2 z-50 border border-red-100">
        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider leading-tight">Delete category and its notes?</span>
        <div className="flex items-center justify-end gap-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); }}
            className="p-1 px-2.5 bg-white text-[#8E8E93] text-[10px] rounded-lg font-bold border border-[#E5E5EA] hover:bg-[#F2F2F7]"
          >
            Cancel
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(); setIsConfirmingDelete(false); }}
            className="p-1 px-3 bg-red-500 text-white text-[10px] rounded-lg font-bold hover:bg-red-600 shadow-sm"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative group w-full mb-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        onClick={() => !isEditing && onClick()}
        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer select-none group/item ${
          isActive 
            ? 'bg-[#007AFF] text-white shadow-lg' 
            : 'text-[#8E8E93] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]'
        }`}
      >
        {icon ? (
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            {icon}
          </div>
        ) : (
          <div className={`flex-shrink-0 w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-[#C7C7CC]'} ml-1.5`} />
        )}
        {isSidebarOpen && (
          isEditing ? (
            <input
              ref={editInputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className={`bg-black/5 border-none focus:ring-2 focus:ring-[#007AFF]/20 text-sm font-medium w-full rounded px-2 py-0.5 outline-none ${isActive ? 'text-white placeholder-white/60 bg-white/20' : 'text-[#1D1D1F] placeholder-[#8E8E93]'}`}
            />
          ) : (
            <span className={`${isActive ? 'font-bold' : 'font-medium'} text-sm truncate flex-1`}>{label}</span>
          )
        )}
      </div>

      {isCustom && isSidebarOpen && !isEditing && (
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20 transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button 
            type="button"
            onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              setIsEditing(true); 
            }}
            className={`p-1.5 rounded-lg transition-all shadow-sm active:scale-90 ${isActive ? 'bg-white text-[#007AFF] hover:bg-white/90' : 'bg-white border border-[#E5E5EA] text-[#8E8E93] hover:text-[#007AFF]'}`}
          >
            <Edit2 size={12} />
          </button>
          <button 
            type="button"
            onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              setIsConfirmingDelete(true);
            }}
            className={`p-1.5 rounded-lg transition-all shadow-sm active:scale-90 ${isActive ? 'bg-white text-red-500 hover:bg-white/90' : 'bg-white border border-[#E5E5EA] text-red-500 hover:bg-red-600'}`}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

interface CapsuleItemProps {
  index: number;
  key?: string | number;
  capsule: Capsule;
  onUpdate: (updates: Partial<Capsule>) => void;
  onRemovePermanently: () => void;
  allCategories: string[];
  viewMode: 'grid' | 'list';
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onViewDetail: () => void;
  isPremium: boolean;
}

function CapsuleItem({ 
  capsule, 
  index,
  viewMode,
  onUpdate, 
  onRemovePermanently,
  allCategories,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onViewDetail,
  isPremium
}: CapsuleItemProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [isConfiguringCustom, setIsConfiguringCustom] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempReminderDate, setTempReminderDate] = useState<number | null>(capsule.reminder?.date || null);
  const [tempReminderType, setTempReminderType] = useState<ReminderType>(capsule.reminder?.type || 'none');
  
  const timerRef = useRef<number | null>(null);
  const longPressDetected = useRef(false);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (showOptions || showColorPicker || showReminderPicker) {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setShowOptions(false);
          setShowColorPicker(false);
          setShowReminderPicker(false);
          setIsConfiguringCustom(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showOptions, showColorPicker, showReminderPicker]);

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    longPressDetected.current = false;
    if ('touches' in e && e.touches.length > 0) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    timerRef.current = window.setTimeout(() => {
      longPressDetected.current = true;
      if (window.navigator.vibrate) window.navigator.vibrate(40);
      onToggleSelection();
    }, 400);
  };

  const cancelPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    touchStartPos.current = null;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPos.current && e.touches.length > 0) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (dx > 20 || dy > 20) {
        cancelPress(e);
      }
    }
  };

  // Local state for custom reminder form
  const [customInterval, setCustomInterval] = useState(capsule.reminder?.customInterval || 1);
  const [customUnit, setCustomUnit] = useState<'day' | 'week' | 'month'>(capsule.reminder?.customUnit || 'day');

  const handleReminderSelect = (type: ReminderType) => {
    if (type === 'custom') {
      setIsConfiguringCustom(true);
    } else {
      setTempReminderType(type);
    }
  };

  const saveReminder = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const newReminder = tempReminderType === 'none' && !tempReminderDate ? null : {
       type: tempReminderType === 'none' && tempReminderDate ? 'once' : tempReminderType,
       date: tempReminderDate || Date.now() + 86400000,
       ...(tempReminderType === 'custom' ? { customInterval, customUnit } : {})
    };
    
    onUpdate({ reminder: newReminder as any });
    setIsConfiguringCustom(false);
    setShowReminderPicker(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value).getTime();
    if (!isNaN(newDate)) {
      setTempReminderDate(newDate);
      if (tempReminderType === 'none') {
        setTempReminderType('once');
      }
    }
  };
  
  const capsuleColor = capsule.color || '#2E7D32';
  
  return (
    <div className="flex items-center gap-2 md:gap-4 group w-full mb-3 md:mb-4">
      {/* External Selection Indicator - Small circle outside */}
      <AnimatePresence initial={false}>
        {isSelectionMode && (
          <motion.button
            initial={{ opacity: 0, x: -30, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: -30, width: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection();
            }}
            className={cn(
              "shrink-0 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center z-[100]",
              isSelected 
                ? "bg-[#007AFF] border-[#007AFF] text-white shadow-lg" 
                : "bg-white border-[#C7C7CC] hover:border-[#007AFF]"
            )}
          >
            {isSelected && <Check size={14} strokeWidth={4} />}
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        id={index === 0 ? "capsule-item-0" : undefined}
        className={cn(
          "w-full relative rounded-[24px] md:rounded-[28px] shadow-sm transition-all border flex",
          viewMode === 'grid' ? "flex-col h-full min-h-[80px] md:min-h-[140px]" : "flex-row",
          "items-start gap-1.5 p-2.5 md:gap-3 md:p-6",
          isSelected ? "border-[#007AFF] shadow-2xl ring-[6px] ring-[#007AFF]/10 -translate-y-1" : "border-black/5 hover:border-black/10 hover:shadow-xl",
          capsule.completed ? "opacity-60" : "",
          (showOptions || showColorPicker || showReminderPicker) ? "z-[70]" : "z-10"
        )}
        style={{ backgroundColor: capsuleColor }}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchMove={handleTouchMove}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={(e) => {
          if (window.innerWidth <= 768) {
             e.preventDefault();
          }
        }}
        onClick={(e) => {
          if (showOptions || showColorPicker || showReminderPicker) {
            e.stopPropagation();
            setShowOptions(false);
            setShowColorPicker(false);
            setShowReminderPicker(false);
            setIsConfiguringCustom(false);
            return;
          }
          if (longPressDetected.current) {
            e.stopPropagation();
            return;
          }
          if (isSelectionMode) {
            e.stopPropagation();
            onToggleSelection();
          } else {
            onViewDetail();
          }
        }}
      >

        {/* To-do toggle */}
        <div className={cn(
          "flex flex-col items-center gap-2 z-[20] shrink-0 transition-all",
          viewMode === 'grid' ? "absolute top-4 left-4" : "mt-0.5 pl-1"
        )}>
          {capsule.isTodo && (
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ completed: !capsule.completed });
              }}
              className={cn(
                "flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all bg-white/20 border-white/40 hover:bg-white/40 hover:border-white/60",
                capsule.completed ? "bg-white/90 border-transparent text-[#007AFF]" : "text-transparent"
              )}
            >
              {capsule.completed && <Check size={16} strokeWidth={4} />}
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 min-w-0 pt-0.5 flex flex-col h-full",
          viewMode === 'grid' ? "justify-center text-center px-1 pb-4 md:pb-6" : "justify-center text-left"
        )}>
          <div className={cn(
            "text-base sm:text-lg md:text-xl font-bold leading-tight transition-all break-words select-none",
            capsule.completed ? "line-through opacity-50 text-white/70" : "text-white",
            viewMode === 'grid' ? "whitespace-pre-wrap line-clamp-4" : "truncate"
          )}>
            {capsule.content}
          </div>
          
          <div className={cn(
            "flex flex-wrap items-center gap-2 mt-4 shrink-0 opacity-80",
            viewMode === 'grid' ? "justify-center" : ""
          )}>
            {capsule.category && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/10 backdrop-blur-md border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] uppercase font-black tracking-widest text-white">{capsule.category}</span>
              </div>
            )}

            {capsule.reminder && capsule.reminder.type !== 'none' && capsule.reminder.date && (
              <div 
                className="flex items-center justify-center w-5 h-5 rounded-full bg-black/10 backdrop-blur-md border border-white/10 text-white shadow-sm" 
                title={`Reminder: ${new Date(capsule.reminder.date).toLocaleString()}${capsule.reminder.type !== 'once' ? ` (${capsule.reminder.type})` : ''}`}
              >
                <Bell size={12} className={capsule.reminder.date <= Date.now() ? "text-red-300 animate-pulse" : "text-white"} />
              </div>
            )}
            
            {capsule.attachments && capsule.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-white/60">
                <Paperclip size={12} />
                <span className="text-[10px] font-bold">{capsule.attachments.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div ref={menuRef} className={cn(
          "flex items-center gap-1 z-40 transition-opacity relative",
          viewMode === 'grid' ? "absolute bottom-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100" : "opacity-100 md:opacity-0 group-hover:opacity-100 flex-shrink-0"
        )}>
          <div className="flex items-center gap-1 bg-black/5 p-1 rounded-full backdrop-blur-sm">
            <button 
               id={index === 0 ? "capsule-options-btn-0" : undefined}
               onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
               className="p-2 text-white/60 hover:bg-white/20 hover:text-white rounded-full"
            >
              <MoreVertical size={16} />
            </button>
          </div>

          {/* Dropdown Options */}
          <AnimatePresence>
            {showOptions && (
              <>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: viewMode === 'grid' ? 10 : -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: viewMode === 'grid' ? 10 : -10 }}
                  className={cn("absolute bg-white border border-[#E5E5EA] rounded-xl shadow-2xl z-50 overflow-hidden text-[#1D1D1F] w-48 md:w-56",
                    "top-full mt-2 right-0"
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowColorPicker(true); setShowOptions(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F2F2F7] font-medium"
                  >
                    <Palette size={14} />
                    Change Color
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowReminderPicker(true); setTempReminderDate(capsule.reminder?.date || null); setTempReminderType(capsule.reminder?.type || 'none'); setShowOptions(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F2F2F7] font-medium"
                  >
                    <Calendar size={14} />
                    Set Reminder
                  </button>
                  <div className="border-t border-[#F2F2F7] my-1" />
                  {!capsule.isDeleted && (
                    <>
                      <div className="px-3 py-1 text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider bg-[#F2F2F7]">Category</div>
                      <div className="px-2 py-1.5">
                        <input 
                          type="text"
                          placeholder="Add category..."
                          defaultValue={capsule.category || ''}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.currentTarget.value).trim();
                              onUpdate({ category: val || undefined });
                              setShowOptions(false);
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-[#F2F2F7] rounded-md text-xs border-none outline-none focus:ring-2 focus:ring-[#007AFF]"
                        />
                      </div>
                      <div className="border-t border-[#F2F2F7] my-1 pt-1" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdate({ isTodo: !capsule.isTodo }); setShowOptions(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F2F2F7]"
                      >
                        {capsule.isTodo ? <Square size={14} /> : <CheckSquare size={14} />}
                        {capsule.isTodo ? 'Cancel To-do' : 'Set To-do'}
                      </button>
                      <div className="border-t border-[#F2F2F7] my-1 pt-1">
                        <div className="px-3 py-1.5 text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider">Tags</div>
                        <div className="px-2 pb-1.5">
                          <input 
                            type="text"
                            placeholder="Add tag..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.currentTarget.value).trim().replace('#', '');
                                if (val && !capsule.tags?.includes(val)) {
                                  onUpdate({ tags: [...(capsule.tags || []), val] });
                                  e.currentTarget.value = '';
                                  setShowOptions(false);
                                }
                              }
                            }}
                            className="w-full px-2 py-1.5 bg-[#F2F2F7] rounded-md text-xs border-none outline-none focus:ring-2 focus:ring-[#007AFF]"
                          />
                        </div>
                      </div>
                      <div className="border-t border-[#F2F2F7] my-1 pt-1" />
                      <button 
                        onClick={() => { onUpdate({ isArchived: !capsule.isArchived }); setShowOptions(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F2F2F7]"
                      >
                        {capsule.isArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
                        {capsule.isArchived ? 'Restore' : 'Archive'}
                      </button>
                      <button 
                        onClick={() => { onUpdate({ isDeleted: true }); setShowOptions(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#FF3B30] hover:bg-[#FF3B30]/10"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </>
                  )}
                  {capsule.isDeleted && (
                    <>
                      <button 
                        onClick={() => { onUpdate({ isDeleted: false }); setShowOptions(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F2F2F7]"
                      >
                        <RotateCcw size={14} />
                        Restore
                      </button>
                      <button 
                        onClick={() => { onRemovePermanently(); setShowOptions(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#FF3B30] hover:bg-[#FF3B30]/10"
                      >
                        <Trash2 size={14} />
                        Delete Forever
                      </button>
                    </>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Color Picker Popup */}
          <AnimatePresence>
            {showColorPicker && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowColorPicker(false);
                  }} 
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E5E5EA] rounded-2xl shadow-2xl z-50 p-3 text-[#1D1D1F]"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <div className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">Presets</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRESET_COLORS.map(color => (
                      <button 
                        key={color}
                        onClick={() => { onUpdate({ color }); setShowColorPicker(false); }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shadow-sm ${capsule.color === color ? 'border-[#007AFF] scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button 
                      onClick={() => { onUpdate({ color: null as any }); setShowColorPicker(false); }}
                      className={`w-6 h-6 rounded-full border-2 border-dashed border-[#D1D1D6] flex items-center justify-center text-[#8E8E93] hover:border-[#8E8E93] hover:text-[#1D1D1F] transition-all bg-[#F2F2F7] ${!capsule.color ? 'border-[#007AFF] text-[#007AFF] bg-[#007AFF]/10' : ''}`}
                      title="Reset to default"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                  
                  <div className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5 px-1">Custom Color</div>
                  <label className="flex items-center gap-2 p-2 bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg cursor-pointer hover:bg-[#F2F2F7] transition-all relative group overflow-hidden">
                     <div className="w-6 h-6 rounded-md shadow-sm border border-black/10 overflow-hidden relative shrink-0">
                       <input 
                         type="color" 
                         value={capsule.color || '#6BCB77'}
                         onChange={(e) => onUpdate({ color: e.target.value })}
                         className="absolute -top-4 -left-4 w-12 h-12 cursor-pointer p-0 m-0 border-none bg-transparent opacity-0 z-10"
                       />
                       <div className="w-full h-full absolute inset-0 z-0" style={{ backgroundColor: capsule.color || '#6BCB77' }} />
                     </div>
                     <div className="flex flex-col flex-1 relative z-0 pointer-events-none">
                       <span className="text-[10px] font-bold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">Palette 🎨</span>
                       <span className="text-[9px] text-[#8E8E93] font-mono uppercase leading-none">{capsule.color || '#HEX'}</span>
                     </div>
                  </label>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        {/* Reminder Type Picker & Custom Config */}
        <AnimatePresence>
          {showReminderPicker && (
            <>
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowReminderPicker(false);
                  setIsConfiguringCustom(false);
                }} 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E5E5EA] rounded-xl shadow-2xl z-50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {!isConfiguringCustom ? (
                  <div className="p-1">
                    <div className="px-3 py-2 border-b border-[#F2F2F7]">
                       <div className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5">Specific Time</div>
                        <input 
                          type="datetime-local" 
                          value={tempReminderDate ? new Date(tempReminderDate - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                          onChange={handleTimeChange}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 bg-[#F2F2F7] rounded-md text-[10px] sm:text-[11px] border-none focus:ring-2 focus:ring-[#007AFF] outline-none"
                        />
                    </div>
                    <div className="px-3 py-1.5 text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider">Repeat</div>
                    {(['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as ReminderType[]).map(type => (
                      <button 
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReminderSelect(type);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-[#F2F2F7] capitalize font-medium rounded-lg transition-colors ${(tempReminderType === type || (tempReminderType === 'none' && type === 'once')) ? 'text-[#007AFF] bg-[#007AFF]/5' : 'text-[#1D1D1F]'}`}
                      >
                        <span>{type === 'once' ? 'No repeat' : type}</span>
                        {(tempReminderType === type || (tempReminderType === 'none' && type === 'once')) && <Check size={12} />}
                      </button>
                    ))}
                    <div className="p-2 border-t border-[#F2F2F7] mt-1 flex gap-2">
                      <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           onUpdate({ reminder: undefined });
                           setShowReminderPicker(false);
                           setIsConfiguringCustom(false);
                         }}
                         className="flex-1 py-1.5 bg-[#F2F2F7] text-[#FF3B30] rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        Clear
                      </button>
                      <button 
                         onClick={saveReminder}
                         className="flex-1 py-1.5 bg-[#007AFF] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#0051FF] transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-1 mb-1">
                      <button onClick={(e) => { e.stopPropagation(); setIsConfiguringCustom(false); }} className="p-1 hover:bg-[#F2F2F7] rounded-md">
                         <X size={14} />
                      </button>
                      <span className="text-xs font-bold uppercase tracking-tight">Custom Repeat</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] font-bold text-[#8E8E93] uppercase block mb-1">Every</label>
                        <div className="flex items-center gap-2">
                           <input 
                             type="number" 
                             min="1"
                             value={customInterval}
                             onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)}
                             onClick={(e) => e.stopPropagation()}
                             className="w-16 px-2 py-1.5 bg-[#F2F2F7] rounded-md text-xs border-none outline-none focus:ring-2 focus:ring-[#007AFF] text-center"
                           />
                           <select 
                             value={customUnit}
                             onChange={(e) => setCustomUnit(e.target.value as any)}
                             onClick={(e) => e.stopPropagation()}
                             className="flex-1 px-2 py-1.5 bg-[#F2F2F7] rounded-md text-xs border-none outline-none focus:ring-2 focus:ring-[#007AFF]"
                           >
                             <option value="day">Days</option>
                             <option value="week">Weeks</option>
                             <option value="month">Months</option>
                           </select>
                        </div>
                      </div>
                      
                      <button 
                        onClick={saveReminder}
                        className="w-full py-2 bg-[#007AFF] text-white rounded-lg text-xs font-bold shadow-md hover:bg-[#0051FF] transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  </div>
);
}

function TagItem({ tag, tagFilter, setTagFilter, setCategoryFilter, removeTag, onRename, isMobile, setIsSidebarOpen }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tag);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    if (editValue.trim() && editValue !== tag) {
      onRename?.(tag, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setEditValue(tag);
      setIsEditing(false);
    }
  };

  if (isConfirmingDelete) {
    return (
      <div className="px-3 py-2 mb-1 bg-red-50 rounded-xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-right-2 z-50 border border-red-100">
        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider leading-tight">Delete tag and its notes?</span>
        <div className="flex items-center justify-end gap-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); }}
            className="p-1 px-2.5 bg-white text-[#8E8E93] text-[10px] rounded-lg font-bold border border-[#E5E5EA] hover:bg-[#F2F2F7]"
          >
            Cancel
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); removeTag(tag); setIsConfirmingDelete(false); }}
            className="p-1 px-3 bg-red-500 text-white text-[10px] rounded-lg font-bold hover:bg-red-600 shadow-sm"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative group w-full mb-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        onClick={() => {
          if (isEditing) return;
          setTagFilter(tag === tagFilter ? null : tag);
          setCategoryFilter('all');
          if (isMobile) setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer select-none ${
          tagFilter === tag 
            ? 'bg-[#007AFF] text-white shadow-lg' 
            : 'text-[#8E8E93] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]'
        }`}
      >
        <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${tagFilter === tag ? 'bg-white' : 'bg-current opacity-40'}`} />
        {isEditing ? (
          <input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={`bg-black/5 border-none focus:ring-2 focus:ring-[#007AFF]/20 text-sm font-medium w-full rounded px-2 py-0.5 outline-none ${tagFilter === tag ? 'text-white placeholder-white/60 bg-white/20' : 'text-[#1D1D1F] placeholder-[#8E8E93]'}`}
          />
        ) : (
          <span className={`${tagFilter === tag ? 'font-bold' : 'font-medium'} truncate flex-1`}>{tag}</span>
        )}
      </div>

      {!isEditing && (
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20 transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
            className={`p-1.5 rounded-lg shadow-sm active:scale-90 transition-all ${tagFilter === tag ? 'bg-white text-[#007AFF] hover:bg-white/90' : 'bg-white border border-[#E5E5EA] text-[#8E8E93] hover:text-[#007AFF]'}`}
            title="Rename"
          >
            <Edit2 size={12} />
          </button>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsConfirmingDelete(true); }}
            className={`p-1.5 rounded-lg shadow-sm active:scale-90 transition-all ${tagFilter === tag ? 'bg-white text-red-500 hover:bg-white/90' : 'bg-white border border-[#E5E5EA] text-red-500 hover:bg-red-600'}`}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

