import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
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
  Folder,
  Tag as TagLucideIcon,
  PanelLeft,
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
  MessageSquare,
  BarChart3,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  RefreshCw,
  Pin,
  Star,
  Mail, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  UserPlus, 
  Apple, 
  ExternalLink, 
  Share2,
  Layers
} from 'lucide-react';
import { Capsule, FilterType, ReminderConfig, ReminderType, UserProfile } from './types';
import { PRESET_COLORS } from './constants';
import { categorizeThought } from './services/geminiService';
import { 
  getDb, 
  getAuth, 
  getGoogleProvider, 
  getAppleProvider,
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
  deleteField,
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { setDoc, getDocs, writeBatch } from 'firebase/firestore';

import { cn } from './lib/utils';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

import { LandingPage } from './components/LandingPage';
import { AppLogo } from './components/AppLogo';
import { PremiumModal } from './components/PremiumModal';
import { SettingsModal } from './components/SettingsModal';
import { hasPremiumAccess, PAYWALL_ACTIVE } from './featureFlags';

import { CapsuleEditor } from './components/CapsuleEditor';

const ONBOARDING_STORAGE_KEY = 'onboarding_v4_complete';

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Embedded preview / disabled storage must not white-screen the app */
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

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
  const auth = getAuth();
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

function hasActiveReminder(c: Capsule): boolean {
  return !!(c.reminder && c.reminder.type !== 'none');
}

/** Repeating reminder (not none / once). */
function hasRepeatReminder(c: Capsule): boolean {
  const t = c.reminder?.type;
  if (!t || t === 'none' || t === 'once') return false;
  return true;
}

/** One-shot reminder whose scheduled time has passed. */
function hasFinishedOneShotReminder(c: Capsule): boolean {
  const r = c.reminder;
  if (!r || r.type === 'none') return false;
  if (r.type !== 'once') return false;
  return r.date != null && r.date <= Date.now();
}

/** Toggling to-do done alone must not change list order (no updatedAt bump). */
function shouldBumpUpdatedAt(updates: Partial<Capsule>): boolean {
  const keys = (Object.keys(updates) as (keyof Capsule)[]).filter(
    (k) => updates[k] !== undefined,
  );
  if (keys.length === 1 && keys[0] === 'completed') return false;
  if (keys.length === 1 && keys[0] === 'isPinned') return false;
  return true;
}

/** Merge updates into a capsule and drop `category` / `tags` / `attachments` when cleared (Firestore deleteField). */
function mergeCapsulePatch(c: Capsule, updates: Partial<Capsule>): Capsule {
  let n: Capsule = { ...c, ...updates };
  if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
    const v = updates.category;
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      const { category: _omit, ...rest } = n;
      n = rest as Capsule;
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'tags')) {
    const t = updates.tags;
    if (t === undefined || t === null || (Array.isArray(t) && t.length === 0)) {
      const { tags: _omit, ...rest } = n;
      n = rest as Capsule;
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'attachments')) {
    const a = updates.attachments;
    if (a === undefined || a === null || (Array.isArray(a) && a.length === 0)) {
      const { attachments: _omit, ...rest } = n;
      n = rest as Capsule;
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'color')) {
    const col = updates.color;
    if (col === undefined || col === null || (typeof col === 'string' && col.trim() === '')) {
      const { color: _omit, ...rest } = n;
      n = rest as Capsule;
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'isPinned')) {
    if (updates.isPinned !== true) {
      const { isPinned: _omit, ...rest } = n;
      n = rest as Capsule;
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'reminder')) {
    const r = updates.reminder;
    if (r === undefined || r === null) {
      const { reminder: _omit, ...rest } = n;
      n = rest as Capsule;
    }
  }
  return n;
}

/** Firestore `update()` fields for batch writes (aligned with `updateCapsule` cleaning). */
function partialCapsuleToFirestore(updates: Partial<Capsule>): Record<string, unknown> {
  const cleanUpdates: Record<string, unknown> = {};
  Object.entries(updates).forEach(([key, value]) => {
    if (key === 'category') {
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        cleanUpdates[key] = deleteField();
      } else {
        cleanUpdates[key] = value;
      }
      return;
    }
    if (key === 'tags') {
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        cleanUpdates[key] = deleteField();
      } else {
        cleanUpdates[key] = value;
      }
      return;
    }
    if (key === 'attachments') {
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        cleanUpdates[key] = deleteField();
      } else {
        cleanUpdates[key] = value;
      }
      return;
    }
    if (key === 'color') {
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        cleanUpdates[key] = deleteField();
      } else {
        cleanUpdates[key] = value;
      }
      return;
    }
    if (key === 'isPinned') {
      if (!value) {
        cleanUpdates[key] = deleteField();
      } else {
        cleanUpdates[key] = value;
      }
      return;
    }
    if (key === 'reminder') {
      if (value === undefined || value === null) {
        cleanUpdates[key] = deleteField();
      } else {
        cleanUpdates[key] = value;
      }
      return;
    }
    if (value !== undefined) {
      cleanUpdates[key] = value;
    } else {
      cleanUpdates[key] = null;
    }
  });
  return cleanUpdates;
}

function tagsSignature(tags: string[] | undefined): string {
  return [...(tags || [])].map((t) => t.trim()).filter(Boolean).sort().join('\0');
}

function CrownJewel({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow Side (Left half subtle shade) */}
        <path d="M50 85H15V75H85V85H50Z" fill="#E67E22" />
        
        {/* Red Velvet Cushion */}
        <path d="M20 70C20 40 80 40 80 70H20Z" fill="#C0392B" />
        
        {/* Main Golden Body */}
        <path d="M10 40C15 45 20 55 20 75H80C80 55 85 45 90 40L80 55C75 45 80 30 70 25L75 40C70 45 60 45 50 40C40 45 30 45 25 40L30 25C20 30 25 45 20 55L10 40Z" fill="#F1C40F" stroke="#D35400" strokeWidth="1" />
        
        {/* Center Golden Pillar */}
        <path d="M42 45C42 35 45 25 50 15C55 25 58 35 58 45H42Z" fill="#F1C40F" stroke="#D35400" strokeWidth="1" />
        <circle cx="50" cy="18" r="6" fill="#F1C40F" stroke="#D35400" strokeWidth="1" />

        {/* Center Red Gem */}
        <ellipse cx="50" cy="58" rx="6" ry="9" fill="#E74C3C" stroke="#C0392B" strokeWidth="1" />
        
        {/* Bottom Base with Blue Gems */}
        <rect x="15" y="75" width="70" height="12" rx="2" fill="#F39C12" />
        <circle cx="22" cy="81" r="3" fill="#00A8E8" />
        <circle cx="36" cy="81" r="3" fill="#00A8E8" />
        <circle cx="50" cy="81" r="3" fill="#00A8E8" />
        <circle cx="64" cy="81" r="3" fill="#00A8E8" />
        <circle cx="78" cy="81" r="3" fill="#00A8E8" />

        {/* Highlight details */}
        <path d="M50 15L53 18L50 21L47 18L50 15Z" fill="white" opacity="0.3" />
      </svg>
    </div>
  );
}

/** Open width when sidebar is expanded (mobile narrower). */
const SIDEBAR_W = { mobile: 260, desktop: 240 } as const;

/**
 * Helper to extract plain text from Tiptap JSON or plain string
 */
const plainTextFromContent = (content: any): string => {
  if (!content) return '';
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed.startsWith('{')) return trimmed;
    try {
      const parsed = JSON.parse(trimmed);
      return plainTextFromContent(parsed);
    } catch (e) {
      return trimmed;
    }
  }
  
  // If it's a Tiptap node
  if (content.type === 'text') return content.text || '';
  if (content.content && Array.isArray(content.content)) {
    return content.content.map(plainTextFromContent).filter(Boolean).join(' ').trim();
  }
  // If it's a Tiptap array
  if (Array.isArray(content)) {
    return content.map(plainTextFromContent).filter(Boolean).join(' ').trim();
  }
  // Fallback for weird objects
  if (typeof content === 'object') {
    if (content.text) return content.text;
    if (content.value) return content.value;
  }
  return '';
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [capsules, setCapsules] = useState<Capsule[]>([
    {
      id: 'mock-1', 
      content: 'Brainstorming for the new Lumi Note design language. Focusing on glassmorphism and capsule shapes.', 
      category: 'WORK', 
      tags: ['design', 'app'], 
      color: '#007AFF', 
      createdAt: Date.now() - 3600000, 
      updatedAt: Date.now() - 3600000, 
      userId: 'mock-user', 
      isArchived: false, 
      isDeleted: false,
      isTodo: false,
      completed: false
    },
    { 
      id: 'mock-2', 
      content: 'Buy milk and eggs on the way home.', 
      category: 'LIFE', 
      tags: ['grocery'], 
      color: '#FF2D55', 
      createdAt: Date.now() - 7200000, 
      updatedAt: Date.now() - 7200000, 
      userId: 'mock-user', 
      isArchived: false, 
      isDeleted: false,
      isTodo: true,
      completed: false
    },
    { 
      id: 'mock-3', 
      content: 'Researching Gemini Pro API capabilities for smart categorization.', 
      category: 'TECH', 
      tags: ['ai', 'api'], 
      color: '#AF52DE', 
      createdAt: Date.now() - 10800000, 
      updatedAt: Date.now() - 10800000, 
      userId: 'mock-user', 
      isArchived: false, 
      isDeleted: false,
      isTodo: false,
      completed: false
    }
  ]);
  const [demoCapsules, setDemoCapsules] = useState<Capsule[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const allCapsules = React.useMemo(() => {
    return [...demoCapsules, ...capsules].sort((a, b) => {
      const ap = a.isPinned ? 1 : 0;
      const bp = b.isPinned ? 1 : 0;
      if (bp !== ap) return bp - ap;
      const valA = a[sortBy] || a.createdAt || 0;
      const valB = b[sortBy] || b.createdAt || 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [demoCapsules, capsules, sortBy, sortOrder]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth > 768,
  );
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768,
  );
  
  useEffect(() => {
    (window as any)._setIsSidebarOpen = setIsSidebarOpen;
  }, [setIsSidebarOpen]);
  const [isListening, setIsListening] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProFeaturesModal, setShowProFeaturesModal] = useState(false);
  const [firedReminders, setFiredReminders] = useState<Capsule[]>([]);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [dataLoading, setDataLoading] = useState(true);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    // Artificial delay to show animation and "simulate" a refresh, 
    // though Firestore is real-time. This also clears any local staleness.
    await new Promise(r => setTimeout(r, 1000));
    setLastSyncTime(Date.now());
    setIsSyncing(false);
  }, [isSyncing]);

  useEffect(() => {
    const interval = setInterval(() => {
      handleSync();
    }, 1000 * 60 * 60); // 1 hour
    return () => clearInterval(interval);
  }, [handleSync]);
  
  const [isFilterNavExpanded, setIsFilterNavExpanded] = useState(false);
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
      const auth = getAuth();
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
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setAuthError(null);
    } catch (err: any) {
      setAuthError('Could not send reset email.');
    } finally {
      setAuthProcessing(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    let userDocUnsubscribe: () => void;
    const auth = getAuth(); // 按需初始化 Firebase
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        // Listen to user document for premium status
        const db = getDb();
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        userDocUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isPremium: docSnap.data().isPremium || false,
              onboarded: docSnap.data().onboarded || false
            });
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isPremium: false,
              onboarded: false
            });
            // Initial sync
            setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isPremium: false,
              onboarded: false,
              updatedAt: Date.now()
            }, { merge: true });
          }
           setAuthLoading(false);
        }, (error) => {
          console.error("user doc snapshot error", error);
          setAuthLoading(false);
        });
      } else {
        if (userDocUnsubscribe) {
          userDocUnsubscribe();
        }
        setUser(null);
        setCapsules([]);
        setDemoCapsules([]);
        setAuthLoading(false);
        setDataLoading(true);
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

    const db = getDb(); // 按需初始化 Firebase
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
      setDataLoading(false);
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
            safeLocalStorageSet(ONBOARDING_STORAGE_KEY, 'true');
            if (user) {
              const db = getDb(); // 按需初始化 Firebase
              updateDoc(doc(db, 'users', user.uid), { onboarded: true });
            }
          }
        });

        driverObj.drive();
      }, 800); // Give enough time for DOM to update after seeding
    };

    const hasSeenTutorial =
      safeLocalStorageGet(ONBOARDING_STORAGE_KEY) || user.onboarded;
    // Only trigger tour if no tutorial seen AND no real data exists yet
    if (!hasSeenTutorial && !tourActive.current && allCapsules.length === 0 && !dataLoading) {
       setTimeout(() => {
         if ((window as any).startTour && !tourActive.current) {
           (window as any).startTour();
         }
       }, 1500); // 1.5s delay for stable trigger
    }
  }, [user, authLoading, dataLoading, allCapsules.length]);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognition = useRef<any>(null);
  
  const allTags = Array.from(new Set(allCapsules.flatMap(c => c.tags || []))).sort();
  const allCategories = Array.from(new Set(allCapsules.map(c => c.category).filter(Boolean) as string[])).sort();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchColorOpen, setBatchColorOpen] = useState(false);
  const [batchReminderOpen, setBatchReminderOpen] = useState(false);
  const [batchRemDate, setBatchRemDate] = useState<number | null>(null);
  const [batchRemType, setBatchRemType] = useState<ReminderType>('once');

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
        const bump = shouldBumpUpdatedAt(updates);
        const ts = Date.now();
        setDemoCapsules((prev) =>
          prev.map((c) => {
            if (!demoIds.includes(c.id)) return c;
            const merged = mergeCapsulePatch(c, updates);
            return bump ? { ...merged, updatedAt: ts } : merged;
          }),
        );
      }

      if (realIds.length > 0) {
        const db = getDb(); // 按需初始化 Firebase
        const batch = writeBatch(db);
        const now = Date.now();
        const bump = shouldBumpUpdatedAt(updates);
        const clean = partialCapsuleToFirestore(updates);
        if (bump) {
          clean.updatedAt = now;
        }
        realIds.forEach((id: string) => {
          const docRef = doc(db, 'capsules', id);
          batch.update(docRef, clean as Record<string, unknown>);
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
        const db = getDb(); // 按需初始化 Firebase
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
  /** Local draft for detail editor — avoids Firestore write on every keystroke. */
  const [editContentDraft, setEditContentDraft] = useState('');
  const editContentDraftRef = useRef('');
  const editSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editDetailCategory, setEditDetailCategory] = useState('');
  const [editDetailTags, setEditDetailTags] = useState('');
  const editDetailCategoryRef = useRef('');
  const editDetailTagsRef = useRef('');
  const editDetailCapsuleIdRef = useRef<string | null>(null);
  const editingCapsuleRef = useRef<Capsule | null>(null);
  editingCapsuleRef.current = editingCapsule;

  useEffect(() => {
    if (!editingCapsule) {
      editDetailCapsuleIdRef.current = null;
      return;
    }
    if (editDetailCapsuleIdRef.current !== editingCapsule.id) {
      editDetailCapsuleIdRef.current = editingCapsule.id;
      const c = editingCapsule.category || '';
      const t = (editingCapsule.tags || []).join(', ');
      setEditDetailCategory(c);
      setEditDetailTags(t);
      editDetailCategoryRef.current = c;
      editDetailTagsRef.current = t;
    }
  }, [editingCapsule]);

  const clearAllData = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete ALL your data? This cannot be undone.')) return;
    
    setAuthProcessing(true);
    try {
      const db = getDb(); // 按需初始化 Firebase
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
        isTodo: Boolean(
          isTodo ||
            (reminder &&
              typeof reminder === 'object' &&
              (reminder as { type?: string }).type &&
              (reminder as { type?: string }).type !== 'none'),
        ),
        isArchived: false,
        isDeleted: false,
        reminder,
        color: randomColor
      };
      
      const db = getDb(); // 按需初始化 Firebase
      await addDoc(collection(db, 'capsules'), newCapsuleData);
    } catch (error) {
      const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
      try {
        const db = getDb(); // 按需初始化 Firebase
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

  const updateCapsule = useCallback(
    async (id: string, updates: Partial<Capsule>) => {
      if (!user) return;
      const now = Date.now();
      const original = allCapsules.find(c => c.id === id);
      let bump = shouldBumpUpdatedAt(updates);
      
      // If content is being updated, only bump if it actually changed
      if (updates.content !== undefined && original && original.content === updates.content) {
        // Content didn't change, so don't bump for THIS update if only content was provided
        const otherKeys = Object.keys(updates).filter(k => k !== 'content' && k !== 'updatedAt');
        if (otherKeys.length === 0) bump = false;
      }

      setEditingCapsule((prev) => {
        if (!prev || prev.id !== id) return prev;
        const merged = mergeCapsulePatch(prev, updates);
        return bump ? { ...merged, updatedAt: now } : merged;
      });

      if (id.startsWith('demo-')) {
        setDemoCapsules((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            const merged = mergeCapsulePatch(c, updates);
            return bump ? { ...merged, updatedAt: now } : merged;
          }),
        );
        return;
      }
      try {
        const db = getDb(); // 按需初始化 Firebase
        const docRef = doc(db, 'capsules', id);
        const cleanUpdates: Record<string, unknown> = {};
        Object.entries(updates).forEach(([key, value]) => {
          if (key === 'category') {
            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
              cleanUpdates[key] = deleteField();
            } else {
              cleanUpdates[key] = value;
            }
            return;
          }
          if (key === 'tags') {
            if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
              cleanUpdates[key] = deleteField();
            } else {
              cleanUpdates[key] = value;
            }
            return;
          }
          if (key === 'attachments') {
            if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
              cleanUpdates[key] = deleteField();
            } else {
              cleanUpdates[key] = value;
            }
            return;
          }
          if (key === 'isPinned') {
            if (!value) {
              cleanUpdates[key] = deleteField();
            } else {
              cleanUpdates[key] = value;
            }
            return;
          }
          if (value !== undefined) {
            cleanUpdates[key] = value;
          } else {
            cleanUpdates[key] = null;
          }
        });
        if (bump) {
          cleanUpdates.updatedAt = now;
        }
        await updateDoc(docRef, cleanUpdates as any);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `capsules/${id}`);
      }
    },
    [user, allCapsules],
  );

  const updateCapsuleRef = useRef(updateCapsule);
  updateCapsuleRef.current = updateCapsule;

  const patchCapsule = useCallback((id: string, updates: Partial<Capsule>) => {
    return updateCapsuleRef.current(id, updates);
  }, []);

  useEffect(() => {
    if (editingCapsule) {
      const t = editingCapsule.content;
      setEditContentDraft(t);
      editContentDraftRef.current = t;
    }
    const id = editingCapsule?.id;
    if (!id) {
      return () => {
        if (editSaveTimerRef.current) {
          clearTimeout(editSaveTimerRef.current);
          editSaveTimerRef.current = null;
        }
      };
    }
    return () => {
      if (editSaveTimerRef.current) {
        clearTimeout(editSaveTimerRef.current);
        editSaveTimerRef.current = null;
      }
      void updateCapsuleRef.current(id, { content: editContentDraftRef.current });
    };
  }, [editingCapsule?.id]);

  const queueEditContentSave = useCallback(() => {
    if (!editingCapsule) return;
    const id = editingCapsule.id;
    if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
    editSaveTimerRef.current = setTimeout(() => {
      editSaveTimerRef.current = null;
      const draft = editContentDraftRef.current;
      void updateCapsuleRef.current(id, { content: draft });
      setEditingCapsule((prev) =>
        prev?.id === id ? { ...prev, content: draft } : prev,
      );
    }, 450);
  }, [editingCapsule?.id]);

  const closeEditingModal = useCallback(() => {
    if (editSaveTimerRef.current) {
      clearTimeout(editSaveTimerRef.current);
      editSaveTimerRef.current = null;
    }
    const cap = editingCapsuleRef.current;
    if (cap) {
      const cat = editDetailCategoryRef.current.trim();
      const tagParts = editDetailTagsRef.current.split(',').map((t) => t.trim()).filter(Boolean);
      const prevCat = (cap.category || '').trim();
      const patch: Partial<Capsule> = {};
      if (prevCat !== cat) {
        patch.category = cat ? cat : undefined;
      }
      if (tagsSignature(cap.tags) !== tagsSignature(tagParts)) {
        patch.tags = tagParts.length ? tagParts : undefined;
      }
      if (Object.keys(patch).length > 0) {
        void updateCapsuleRef.current(cap.id, patch);
      }
    }
    setEditingCapsule(null);
  }, []);

  const handleAttachMedia = (e: React.ChangeEvent<HTMLInputElement>, capsule: Capsule) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (editingCapsule?.id === capsule.id) {
      const draft = editContentDraftRef.current;
      void updateCapsule(capsule.id, { content: draft });
      setEditingCapsule((prev) =>
        prev?.id === capsule.id ? { ...prev, content: draft } : prev,
      );
      if (editSaveTimerRef.current) {
        clearTimeout(editSaveTimerRef.current);
        editSaveTimerRef.current = null;
      }
    }
    
    if (!hasPremiumAccess(user) && (file.size > 5 * 1024 * 1024 || isVideo)) {
       alert("Large images (>5MB) and video uploads require Lumi Note Pro.");
       setShowPremiumModal(true);
       return;
    }
    
    if (file.size > 800 * 1024 || isVideo) {
      const url = URL.createObjectURL(file);
      const newAttachments = [...(capsule.attachments || []), { url, type: (isVideo ? 'video' : 'image') as 'video' | 'image' }];
      updateCapsule(capsule.id, { attachments: newAttachments });
      setEditingCapsule((prev) =>
        prev?.id === capsule.id ? { ...prev, attachments: newAttachments } : prev,
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (ee) => {
      const dataUrl = ee.target?.result as string;
      const newAttachments = [...(capsule.attachments || []), { url: dataUrl, type: 'image' as const }];
      updateCapsule(capsule.id, { attachments: newAttachments });
      setEditingCapsule((prev) =>
        prev?.id === capsule.id ? { ...prev, attachments: newAttachments } : prev,
      );
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (capsule: Capsule, index: number) => {
    if (editSaveTimerRef.current) {
      clearTimeout(editSaveTimerRef.current);
      editSaveTimerRef.current = null;
    }
    const draft = editContentDraftRef.current;
    const newAttachments = [...(capsule.attachments || [])];
    newAttachments.splice(index, 1);
    const patch: Partial<Capsule> = {
      attachments: newAttachments.length ? newAttachments : undefined,
    };
    if (editingCapsule?.id === capsule.id) {
      patch.content = draft;
    }
    void updateCapsule(capsule.id, patch);
    setEditingCapsule((prev) =>
      prev?.id === capsule.id
        ? mergeCapsulePatch(
            { ...prev, content: draft },
            { attachments: newAttachments.length ? newAttachments : undefined },
          )
        : prev,
    );
  };

  const removeCapsuleForever = async (id: string) => {
    if (!user) return;
    if (id.startsWith('demo-')) {
      setDemoCapsules(prev => prev.filter(c => c.id !== id));
      return;
    }
    try {
      const db = getDb(); // 按需初始化 Firebase
      const docRef = doc(db, 'capsules', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `capsules/${id}`);
    }
  };

  const startListening = () => {
    if (!hasPremiumAccess(user)) {
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
    if (hasPremiumAccess(user) && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const interval = setInterval(() => {
      const now = Date.now();
      allCapsules.forEach(cap => {
        if (!cap.reminder?.date || cap.completed || cap.isDeleted || cap.isArchived) return;
        
        // Prevent spamming VERY old reminders
        const isTooOld = now - cap.reminder.date > 1000 * 60 * 30; 
        if (isTooOld) {
          if (cap.reminder.type === 'once') {
            updateCapsule(cap.id, { reminder: { ...cap.reminder, type: 'none' } });
          }
          notifiedIdsRef.current.add(cap.id);
          return;
        }

        if (cap.reminder.date > now || notifiedIdsRef.current.has(cap.id)) return;

        if (window.Notification && Notification.permission === 'granted') {
          new Notification('Lumi Note Reminder', { body: plainTextFromContent(cap.content) });
        }

        notifiedIdsRef.current.add(cap.id);
        setFiredReminders(prev => [...prev, cap]);

        let shouldUpdate = false;
        const nextReminder = { ...cap.reminder };
        if (cap.reminder.type === 'custom' && cap.reminder.customInterval) {
          const mult = cap.reminder.customUnit === 'day' ? 86400000 : cap.reminder.customUnit === 'week' ? 604800000 : 2592000000;
          nextReminder.date = now + cap.reminder.customInterval * mult;
          shouldUpdate = true;
        } else if (cap.reminder.type === 'daily') {
          nextReminder.date = now + 86400000;
          shouldUpdate = true;
        } else if (cap.reminder.type === 'weekly') {
          nextReminder.date = now + 604800000;
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
        } else {
          nextReminder.type = 'none';
          shouldUpdate = true;
        }

        if (shouldUpdate) updateCapsule(cap.id, { reminder: nextReminder as any });
      });
    }, 10000);
    
    return () => clearInterval(interval);
  }, [allCapsules, updateCapsule, user]);

  const sortedCapsules = allCapsules;
  
  const filteredCapsules = sortedCapsules.filter(c => {
    const matchesSearch = c.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (c.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesTag = !tagFilter || (c.tags && c.tags.includes(tagFilter));
    
    // Hard state filters (Archive/Trash)
    if (filter === 'starred') return matchesSearch && matchesCategory && matchesTag && c.isStarred && !c.isArchived && !c.isDeleted;
    if (filter === 'archived') return matchesSearch && matchesCategory && matchesTag && c.isArchived && !c.isDeleted;
    if (filter === 'trash') return matchesSearch && matchesCategory && matchesTag && c.isDeleted;
    
    // Normal view: don't show archived or deleted
    if (c.isArchived || c.isDeleted) return false;

    // Advanced filters
    const matchesAdvanced = (() => {
      switch (filter) {
        case 'pending-todo': return c.isTodo && !c.completed;
        case 'without-todo': return !c.isTodo;
        case 'completed-todo': return c.isTodo && c.completed;
        case 'repeat-reminder': return hasRepeatReminder(c);
        case 'without-reminder': return !hasActiveReminder(c);
        case 'finished-reminder': return hasFinishedOneShotReminder(c);
        case 'pure-note': return !c.isTodo && !hasActiveReminder(c);
        default: return true;
      }
    })();

    return matchesSearch && matchesCategory && matchesTag && matchesAdvanced;
  });

  const countForFilterType = (f: FilterType): number =>
    allCapsules.filter((c) => {
      if (f === 'starred') return c.isStarred && !c.isArchived && !c.isDeleted;
      if (f === 'archived') return c.isArchived && !c.isDeleted;
      if (f === 'trash') return c.isDeleted;
      if (c.isArchived || c.isDeleted) return false;
      switch (f) {
        case 'all':
          return true;
        case 'pending-todo':
          return c.isTodo && !c.completed;
        case 'completed-todo':
          return c.isTodo && !!c.completed;
        case 'repeat-reminder':
          return hasRepeatReminder(c);
        case 'finished-reminder':
          return hasFinishedOneShotReminder(c);
        case 'pure-note':
          return !c.isTodo && !hasActiveReminder(c);
        default:
          return true;
      }
    }).length;

  const filterOptions: { value: FilterType, label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pure-note', label: 'Only Notes' },
    { value: 'pending-todo', label: 'Pending to-do' },
    { value: 'completed-todo', label: 'Finished to-do' },
    { value: 'repeat-reminder', label: 'Repeat reminder' },
    { value: 'finished-reminder', label: 'Finished reminder' },
    { value: 'archived', label: 'Archived' },
    { value: 'trash', label: 'Trash' },
  ];

  useEffect(() => {
    const allowed: FilterType[] = [
      'all',
      'pure-note',
      'pending-todo',
      'completed-todo',
      'repeat-reminder',
      'finished-reminder',
      'archived',
      'trash',
      'starred',
    ];
    if (!allowed.includes(filter)) setFilter('all');
  }, [filter]);

  /** Category, tag, or Starred narrowing (top pill shows N/A in some cases). */
  const isSidebarListScopeActive = categoryFilter !== 'all' || tagFilter !== null || filter === 'starred';
  /** Any active list filter: type, category, or tag (red dot on sidebar controls). */
  const isSidebarScopeFilterActive =
    categoryFilter !== 'all' || tagFilter !== null || filter !== 'all';
  /** Top pill shows N/A when sidebar drives scope; Archived/Trash stay explicit. */
  const topFilterTriggerLabel =
    isSidebarListScopeActive && filter !== 'archived' && filter !== 'trash'
      ? 'N/A'
      : (filterOptions.find((o) => o.value === filter)?.label ?? 'Filter');
  const topFilterTitle = isSidebarListScopeActive
    ? 'List is narrowed by sidebar (category or tag). Type filters still apply on top of that scope.'
    : undefined;

  if (authLoading || (user && dataLoading)) {
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
                      className="w-full pl-12 pr-4 py-4 bg-[#F2F2F7] border-2 border-transparent focus:border-[#007AFF] focus:bg-white rounded-2xl text-sm font-semibold transition-all outline-none placeholder:text-[#1D1D1F]/15"
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
                      className="w-full pl-12 pr-4 py-4 bg-[#F2F2F7] border-2 border-transparent focus:border-[#007AFF] focus:bg-white rounded-2xl text-sm font-semibold transition-all outline-none placeholder:text-[#1D1D1F]/15"
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

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    const auth = getAuth();
                    const googleProvider = getGoogleProvider();
                    signInWithPopup(auth, googleProvider);
                  }}
                  className="flex items-center justify-center bg-white py-3 rounded-xl border border-[#E5E5EA] hover:bg-[#F2F2F7] transition-all active:scale-95 shadow-sm"
                  title="Sign in with Google"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                </button>
                
                <button 
                  onClick={() => alert("Microsoft login is being configured. Please use Google or Email for now.")}
                  className="flex items-center justify-center bg-[#00A4EF] text-white py-3 rounded-xl border border-transparent hover:bg-[#008CDB] transition-all active:scale-95 shadow-sm"
                  title="Sign in with Microsoft"
                >
                  <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg"><path fill="#f3f3f3" d="M0 0h11v11H0z"/><path fill="#f3f3f3" d="M12 0h11v11H12z"/><path fill="#f3f3f3" d="M0 12h11v11H0z"/><path fill="#f3f3f3" d="M12 12h11v11H12z"/></svg>
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
        {isMobile && isSidebarOpen && (
          <motion.button
            type="button"
            aria-label="Close sidebar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/35 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Category Filter */}
      <motion.aside 
        id="sidebar"
        initial={isMobile ? { x: -SIDEBAR_W.mobile } : false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? SIDEBAR_W.mobile : SIDEBAR_W.desktop) : (isMobile ? 0 : 0),
          x: isMobile && !isSidebarOpen ? -SIDEBAR_W.mobile : 0,
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
              className="relative p-1.5 hover:bg-[#F2F2F7] rounded-lg transition-colors text-[#8E8E93] group"
            >
              <ChevronLeft size={20} className="group-hover:text-[#007AFF] transition-colors" />
              {isSidebarScopeFilterActive && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF3B30] ring-1 ring-white pointer-events-none" />
              )}
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {!isSidebarOpen && (
            <>
              <button
                type="button"
                id="nav-compact-all"
                onClick={() => {
                  setFilter('all');
                  setCategoryFilter('all');
                  setTagFilter(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={cn(
                  'w-full mb-1 flex items-center justify-center p-3 rounded-xl border transition-all',
                  filter === 'all' && categoryFilter === 'all' && !tagFilter
                    ? 'bg-[#007AFF] border-[#007AFF] shadow-lg'
                    : 'bg-[#F2F2F7] border-[#E5E5EA] hover:bg-[#ECECEC]',
                )}
                aria-label="All notes"
              >
                <Layers
                  size={18}
                  strokeWidth={2.2}
                  className={cn(
                    filter === 'all' && categoryFilter === 'all' && !tagFilter
                      ? 'text-white'
                      : 'text-[#007AFF]',
                  )}
                />
              </button>
              <button
                type="button"
                id="cat-starred-compact"
                onClick={() => {
                  setFilter('starred');
                  setCategoryFilter('all');
                  setTagFilter(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={cn(
                  'w-full mb-1 flex items-center justify-center p-3 rounded-xl border transition-all',
                  filter === 'starred'
                    ? 'bg-[#007AFF] border-[#007AFF] shadow-lg'
                    : 'bg-[#F2F2F7] border-[#E5E5EA] hover:bg-[#ECECEC]',
                )}
                aria-label="Starred"
              >
                <Star
                  size={18}
                  strokeWidth={2.2}
                  className={cn(
                    'fill-none',
                    filter === 'starred' ? 'text-white' : 'text-[#007AFF]',
                  )}
                />
              </button>
            </>
          )}

          {isSidebarOpen && (
            <>
              <button
                type="button"
                id="nav-all-expanded"
                onClick={() => {
                  setFilter('all');
                  setCategoryFilter('all');
                  setTagFilter(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={cn(
                  'w-full mb-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all text-left',
                  filter === 'all' && categoryFilter === 'all' && !tagFilter
                    ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg'
                    : 'bg-[#F2F2F7] border-[#E5E5EA] hover:bg-[#ECECEC]',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers
                    size={18}
                    strokeWidth={2.2}
                    className={cn(
                      'flex-shrink-0',
                      filter === 'all' && categoryFilter === 'all' && !tagFilter
                        ? 'text-white'
                        : 'text-[#007AFF]',
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-bold tracking-normal',
                      filter === 'all' && categoryFilter === 'all' && !tagFilter
                        ? 'text-white'
                        : 'text-[#1D1D1F]',
                    )}
                  >
                    All
                  </span>
                </div>
                {countForFilterType('all') > 0 ? (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                      filter === 'all' && categoryFilter === 'all' && !tagFilter
                        ? 'bg-white/20 text-white'
                        : 'bg-[#E5E5EA] text-[#8E8E93]',
                    )}
                  >
                    {countForFilterType('all')}
                  </span>
                ) : null}
              </button>
              <div
                className="mt-1 mb-1 w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors bg-[#F2F2F7] border border-[#E5E5EA] hover:bg-[#ECECEC]"
                onClick={() => setIsFilterNavExpanded(!isFilterNavExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-[#007AFF]" strokeWidth={2.2} />
                  <span className="text-[#1D1D1F] normal-case text-xs font-bold tracking-normal">
                    Filter
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`transition-transform flex-shrink-0 text-[#8E8E93] ${isFilterNavExpanded ? 'rotate-180' : ''}`}
                />
              </div>
              <div
                className={`overflow-hidden transition-all duration-200 space-y-1 ${isFilterNavExpanded ? 'max-h-[900px] opacity-100 mb-2' : 'max-h-0 opacity-0'}`}
              >
                {filterOptions
                  .filter((o) => o.value !== 'all')
                  .map((opt) => (
                    <SidebarItem
                      key={`filter-${opt.value}`}
                      id={`filter-${opt.value}`}
                      icon={null}
                      label={opt.label}
                      isActive={filter === opt.value && categoryFilter === 'all' && !tagFilter}
                      count={countForFilterType(opt.value)}
                      onClick={() => {
                        setFilter(opt.value);
                        setCategoryFilter('all');
                        setTagFilter(null);
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                      isSidebarOpen={isSidebarOpen}
                    />
                  ))}
              </div>

              <button
                type="button"
                id="cat-starred-expanded"
                onClick={() => {
                  setFilter('starred');
                  setCategoryFilter('all');
                  setTagFilter(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={cn(
                  'w-full mb-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all text-left',
                  filter === 'starred'
                    ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg'
                    : 'bg-[#F2F2F7] border-[#E5E5EA] hover:bg-[#ECECEC]',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Star
                    size={18}
                    strokeWidth={2.2}
                    className={cn(
                      'flex-shrink-0 fill-none',
                      filter === 'starred' ? 'text-white' : 'text-[#007AFF]',
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-bold tracking-normal',
                      filter === 'starred' ? 'text-white' : 'text-[#1D1D1F]',
                    )}
                  >
                    Starred
                  </span>
                </div>
                {countForFilterType('starred') > 0 ? (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                      filter === 'starred'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#E5E5EA] text-[#8E8E93]',
                    )}
                  >
                    {countForFilterType('starred')}
                  </span>
                ) : null}
              </button>

              {allCategories.length > 0 && (
                <>
                  <div
                    className="mt-4 mb-1 w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors bg-[#F2F2F7] border border-[#E5E5EA] hover:bg-[#ECECEC]"
                    onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      <Folder size={16} className="text-[#007AFF]" strokeWidth={2.2} />
                      <span className="text-[#1D1D1F] normal-case text-xs font-bold tracking-normal">
                        Categories
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`transition-transform flex-shrink-0 text-[#8E8E93] ${isCategoriesExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${isCategoriesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    {allCategories.map((cat) => {
                      return (
                        <SidebarItem
                          key={`cat-${cat}`}
                          id={`cat-${cat}`}
                          icon={null}
                          label={cat}
                          isActive={categoryFilter === cat}
                          count={allCapsules.filter((c) => c.category === cat && !c.isArchived && !c.isDeleted).length}
                          onClick={() => {
                            setCategoryFilter(categoryFilter === cat ? 'all' : cat);
                            setTagFilter(null);
                            if (isMobile) setIsSidebarOpen(false);
                          }}
                          onRename={(newName) => {
                            setCapsules((prev) => prev.map((c) => (c.category === cat ? { ...c, category: newName } : c)));
                            if (categoryFilter === cat) setCategoryFilter(newName);
                          }}
                          onDelete={() => {
                            setCapsules((prev) => prev.filter((c) => c.category !== cat));
                            if (categoryFilter === cat) setCategoryFilter('all');
                          }}
                          isSidebarOpen={isSidebarOpen}
                          isCustom={true}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              {allTags.length > 0 && (
                <>
                  <div
                    className="mt-4 mb-1 w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors bg-[#F2F2F7] border border-[#E5E5EA] hover:bg-[#ECECEC]"
                    onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      <TagLucideIcon size={16} className="text-[#007AFF]" strokeWidth={2.2} />
                      <span className="text-[#1D1D1F] normal-case text-xs font-bold tracking-normal">Tags</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`transition-transform flex-shrink-0 text-[#8E8E93] ${isTagsExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-200 space-y-1 ${isTagsExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                  >
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
                          count={allCapsules.filter((c) => c.tags?.includes(tag) && !c.isArchived && !c.isDeleted).length}
                          onRename={(oldTag: string, newTag: string) => {
                            setCapsules((prev) =>
                              prev.map((c) => {
                                if (c.tags?.includes(oldTag)) {
                                  return { ...c, tags: c.tags.map((t) => (t === oldTag ? newTag : t)) };
                                }
                                return c;
                              }),
                            );
                            if (tagFilter === oldTag) setTagFilter(newTag);
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </nav>

        {isSidebarOpen && !safeLocalStorageGet(ONBOARDING_STORAGE_KEY) && (
          <div className="px-3 pb-3">
             <button 
                onClick={() => {
                   safeLocalStorageRemove(ONBOARDING_STORAGE_KEY);
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
                    {PAYWALL_ACTIVE && user.isPremium && (
                       <span className="flex items-center gap-0.5 bg-gradient-to-r from-[#AF52DE] to-[#FF2D55] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm">
                         <CrownJewel size={11} /> Pro
                       </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button 
                      onClick={() => {
                        const auth = getAuth();
                        signOut(auth);
                      }}
                      className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:opacity-70 transition-opacity flex items-center gap-1"
                    >
                      <LogOut size={10} />
                      Sign Out
                    </button>
                    <div className="w-1 h-1 rounded-full bg-[#E5E5EA]" />
                    <button 
                      onClick={handleSync}
                      disabled={isSyncing}
                      title={`Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}`}
                      className="text-[10px] font-bold text-[#007AFF] uppercase tracking-wider hover:opacity-70 transition-opacity flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} />
                      {isSyncing ? 'Syncing' : 'Sync'}
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
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="relative p-2 hover:bg-[#F2F2F7] border border-[#E5E5EA] shadow-sm bg-white rounded-xl text-[#007AFF] transition-all flex items-center justify-center shrink-0 active:scale-95"
                aria-label={
                  isSidebarScopeFilterActive
                    ? 'Open sidebar — a filter is active'
                    : 'Open sidebar'
                }
              >
                <PanelLeft size={22} strokeWidth={2.25} />
                {isSidebarScopeFilterActive ? (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF3B30] ring-2 ring-white pointer-events-none"
                    aria-hidden
                  />
                ) : null}
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
            {PAYWALL_ACTIVE && !hasPremiumAccess(user) && (
               <button 
                  onClick={() => setShowPremiumModal(true)} 
                  className="flex bg-gradient-to-r from-[#AF52DE] to-[#FF2D55] text-white px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl text-[13px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 uppercase items-center gap-1.5"
               >
                 <CrownJewel size={17} className="md:scale-90" /> <span className="hidden md:inline">Upgrade</span>
               </button>
            )}
            <button
              id="pro-features-btn"
              onClick={() => setShowProFeaturesModal(true)}
              className={cn(
                "flex w-10 h-10 items-center justify-center rounded-xl transition-all active:scale-95",
                user.isPremium 
                  ? "bg-gradient-to-br from-[#AF52DE] to-[#FF2D55] text-white shadow-lg shadow-[#AF52DE]/20" 
                  : "bg-[#F2F2F7] text-[#8E8E93] hover:bg-[#E5E5EA]"
              )}
              aria-label="Pro Features"
            >
              <CrownJewel size={22} />
            </button>
            <button
              id="view-mode-toggle"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="flex w-10 h-10 items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F2F2F7] rounded-xl hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
            >
              {viewMode === 'grid' ? <LayoutList size={20} /> : <LayoutGrid size={20} />}
            </button>

            <div className="relative">
              <button
                id="sort-dropdown-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSortMenuOpen(!isSortMenuOpen);
                  setIsFilterMenuOpen(false);
                }}
                className={cn(
                  "flex w-10 h-10 items-center justify-center rounded-xl transition-all active:scale-95",
                  isSortMenuOpen ? "bg-[#E5E5EA] text-[#007AFF]" : "bg-[#F2F2F7] text-[#8E8E93] hover:bg-[#E5E5EA]"
                )}
                title="Sort notes"
              >
                {sortOrder === 'desc' ? <ArrowDownNarrowWide size={20} /> : <ArrowUpNarrowWide size={20} />}
              </button>

              <AnimatePresence>
                {isSortMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSortMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 min-w-[220px] w-max max-w-[90vw] bg-white/90 backdrop-blur-xl border border-white/20 rounded-[18px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 p-2"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest">Sort By</div>
                      {[
                        { label: 'Modification Time', value: 'updatedAt' },
                        { label: 'Creation Time', value: 'createdAt' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (sortBy === opt.value) {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortBy(opt.value as any);
                              setSortOrder('desc');
                            }
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                            sortBy === opt.value 
                              ? 'bg-[#E5E5EA] text-[#1D1D1F]' 
                              : 'hover:bg-[#F2F2F7] text-[#1D1D1F]'
                          }`}
                        >
                          <span className="whitespace-nowrap flex-1 min-w-0 text-left">{opt.label}</span>
                          {sortBy === opt.value && (
                            sortOrder === 'desc' ? <ArrowDownNarrowWide size={14} className="text-[#007AFF] shrink-0" /> : <ArrowUpNarrowWide size={14} className="text-[#007AFF] shrink-0" />
                          )}
                        </button>
                      ))}
                      <div className="h-px bg-[#F2F2F7] my-1 mx-2" />
                      <div className="px-3 py-1.5 text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest">Order</div>
                      {[
                        { label: 'Newest First', value: 'desc' },
                        { label: 'Oldest First', value: 'asc' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortOrder(opt.value as any);
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                            sortOrder === opt.value 
                              ? 'bg-[#E5E5EA] text-[#1D1D1F]' 
                              : 'hover:bg-[#F2F2F7] text-[#1D1D1F]'
                          }`}
                        >
                          <span className="whitespace-nowrap flex-1 min-w-0 text-left">{opt.label}</span>
                          {sortOrder === opt.value && <Check size={14} className="text-[#007AFF] shrink-0" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="relative md:hidden">
            <button 
              type="button"
              id="filter-dropdown-btn"
              title={topFilterTitle}
              disabled={isSidebarListScopeActive && filter !== 'archived' && filter !== 'trash'}
              onClick={(e) => {
                e.stopPropagation();
                setIsFilterMenuOpen(!isFilterMenuOpen);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 flex-shrink-0 shadow-sm border rounded-full text-[13px] font-semibold transition-all ${
                isSidebarListScopeActive && filter !== 'archived' && filter !== 'trash'
                  ? 'bg-[#F2F2F7] border-[#E5E5EA] text-[#8E8E93] cursor-default opacity-80'
                  : 'bg-white border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F2F2F7] active:scale-95'
              }`}
            >
              <span className="truncate max-w-[80px] sm:max-w-none">{topFilterTriggerLabel}</span>
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
                          if (opt.value === 'starred') {
                            setCategoryFilter('all');
                            setTagFilter(null);
                          }
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
          </div>
        </header>

        {/* Capsule List */}
        <div id="scroll-container" className="flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-6 custom-scrollbar scroll-smooth">
          <div className={`w-full pb-36 transition-all duration-300 ${
            selectedIds.size > 0 ? 'mt-3' : ''
          } ${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 md:gap-5' 
              : 'w-full max-w-[1200px] flex flex-col space-y-2.5 md:space-y-3.5'
          } ${isSidebarOpen ? 'ml-0' : 'mx-auto'}`}>
            <AnimatePresence initial={false}>
              {filteredCapsules.map((capsule, index) => (
                <div key={capsule.id} className="flex items-center gap-3 md:gap-5 group/list">
                  {selectedIds.size > 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSelection(capsule.id); }}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all",
                        selectedIds.has(capsule.id) 
                          ? "bg-[#007AFF] border-[#007AFF]" 
                          : "border-[#C7C7CC] hover:border-[#8E8E93]"
                      )}
                    >
                      {selectedIds.has(capsule.id) && <Check size={14} className="text-white" strokeWidth={3} />}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <CapsuleItem 
                      capsule={capsule}
                      index={index}
                      viewMode={viewMode}
                      patchCapsule={patchCapsule}
                      onRemovePermanently={() => removeCapsuleForever(capsule.id)}
                      allCategories={allCategories}
                      allTags={allTags}
                      isSelectionMode={selectedIds.size > 0}
                      isSelected={selectedIds.has(capsule.id)}
                      onToggleSelection={() => toggleSelection(capsule.id)}
                      onViewDetail={() => setEditingCapsule(capsule)}
                      isPremium={hasPremiumAccess(user)}
                    />
                  </div>
                </div>
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
                onClick={closeEditingModal}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-4xl bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden flex flex-col h-[90vh] md:h-[85vh]"
              >
                <div 
                  className="h-20 w-full flex items-center justify-between px-5 md:px-8 gap-3"
                  style={{ backgroundColor: 'white', borderBottom: '1px solid #F2F2F7' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: editingCapsule.color || '#F2F2F7' }} />
                    <span className="font-black tracking-tight text-lg md:text-xl text-[#1D1D1F] truncate">Edit Note</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label={editingCapsule.isPinned ? 'Unpin note' : 'Pin note'}
                      onClick={(e) => {
                        e.stopPropagation();
                        patchCapsule(editingCapsule.id, { isPinned: !editingCapsule.isPinned });
                      }}
                      className="w-11 h-11 flex items-center justify-center rounded-full bg-[#1D1D1F] shadow-md hover:opacity-90 transition-opacity"
                    >
                      <Pin
                        size={22}
                        className={editingCapsule.isPinned ? 'text-[#007AFF] fill-[#007AFF]' : 'text-white'}
                        strokeWidth={2}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label={editingCapsule.isStarred ? 'Unstar note' : 'Star note'}
                      onClick={(e) => {
                        e.stopPropagation();
                        patchCapsule(editingCapsule.id, { isStarred: !editingCapsule.isStarred });
                      }}
                      className="w-11 h-11 flex items-center justify-center rounded-full bg-[#1D1D1F] shadow-md hover:opacity-90 transition-opacity"
                    >
                      <Star
                        size={22}
                        className={editingCapsule.isStarred ? 'text-[#FFCC00] fill-[#FFCC00]' : 'text-white'}
                        strokeWidth={2}
                      />
                    </button>
                    <button 
                      type="button"
                      onClick={closeEditingModal}
                      className="w-11 h-11 flex items-center justify-center bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-full transition-colors"
                    >
                      <X size={20} className="text-[#8E8E93]" />
                    </button>
                  </div>
                </div>

                <div className="p-5 md:p-8 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
                  {editingCapsule.attachments && editingCapsule.attachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
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

                  <div className="max-w-2xl mx-auto w-full space-y-4 mb-4">
                    <div className="relative">
                      <div className="text-[11px] font-black uppercase tracking-widest text-[#AEAEB2] mb-1.5">
                        Category <span className="font-mono font-bold text-[#636366] normal-case tracking-normal">(one value)</span>
                      </div>
                      <input
                        type="text"
                        value={editDetailCategory}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditDetailCategory(v);
                          editDetailCategoryRef.current = v;
                        }}
                        onBlur={() => {
                          const t = editDetailCategoryRef.current.trim();
                          const prev = (editingCapsule.category || '').trim();
                          if (prev === t) return;
                          patchCapsule(editingCapsule.id, { category: t || undefined });
                        }}
                        className="w-full bg-[#F2F2F7] border border-transparent focus:border-[#007AFF]/30 rounded-2xl px-4 py-3 text-sm font-semibold text-[#1D1D1F] focus:ring-2 focus:ring-[#007AFF]/15 outline-none"
                        placeholder="e.g. Work"
                        list="edit-detail-categories"
                      />
                      <datalist id="edit-detail-categories">
                        {allCategories.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div className="relative">
                      <div className="text-[11px] font-black uppercase tracking-widest text-[#AEAEB2] mb-1.5">
                        Tags <span className="font-mono font-bold text-[#636366] normal-case tracking-normal">(comma separated)</span>
                      </div>
                      <input
                        type="text"
                        value={editDetailTags}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditDetailTags(v);
                          editDetailTagsRef.current = v;
                        }}
                        onBlur={() => {
                          const parts = editDetailTagsRef.current.split(',').map((x) => x.trim()).filter(Boolean);
                          if (tagsSignature(editingCapsule.tags) === tagsSignature(parts)) return;
                          patchCapsule(editingCapsule.id, { tags: parts.length ? parts : undefined });
                        }}
                        className="w-full bg-[#F2F2F7] border border-transparent focus:border-[#007AFF]/30 rounded-2xl px-4 py-3 text-sm font-semibold text-[#1D1D1F] focus:ring-2 focus:ring-[#007AFF]/15 outline-none"
                        placeholder="idea, follow-up, …"
                        list="edit-detail-tags"
                      />
                      <datalist id="edit-detail-tags">
                        {allTags.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pt-2 pb-16 md:pb-20">
                    <textarea 
                      value={editContentDraft}
                      onChange={(e) => {
                        const v = e.target.value;
                        editContentDraftRef.current = v;
                        setEditContentDraft(v);
                        queueEditContentSave();
                      }}
                      className="w-full flex-1 text-lg md:text-xl font-medium text-[#1C1C1E] bg-transparent border-none focus:ring-0 resize-none leading-relaxed placeholder:text-[#C7C7CC] placeholder:font-normal min-h-[200px]"
                      placeholder="Start typing your brilliance..."
                      autoFocus
                    />
                  </div>
                </div>
                
                <div className="p-3 md:p-5 bg-[#F8F9FA] border-t border-[#E5E5EA] flex justify-between items-center gap-3">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer p-2 text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] rounded-xl transition-all flex hidden md:flex items-center gap-2 shrink-0">
                        <ImageIcon size={20} />
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleAttachMedia(e, editingCapsule)} />
                      </label>
                      <label className="cursor-pointer md:hidden p-2 text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] rounded-xl transition-all shrink-0">
                        <Paperclip size={20} />
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleAttachMedia(e, editingCapsule)} />
                      </label>
                      <span className="text-[10px] font-bold text-[#C7C7CC] uppercase tracking-wider truncate">
                        Created: {new Date(editingCapsule.createdAt).toLocaleDateString()} {new Date(editingCapsule.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {editingCapsule.reminder?.date && (
                      <div className="pl-12 flex items-center gap-1.5 -mt-1">
                        <Bell size={10} className="text-[#007AFF]" />
                        <span className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest">
                          Reminder: {new Date(editingCapsule.reminder.date).toLocaleDateString()} {new Date(editingCapsule.reminder.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({repeatLabelForMenu(editingCapsule.reminder)})
                        </span>
                      </div>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={closeEditingModal}
                    className="px-6 py-2.5 shrink-0 bg-[#1D1D1F] text-white rounded-xl text-sm font-bold shadow-md hover:bg-black hover:scale-[1.02] transition-all"
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

                {filter !== 'archived' && filter !== 'trash' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const sel = allCapsules.filter((c) => selectedIds.has(c.id));
                        const allPinned = sel.length > 0 && sel.every((c) => c.isPinned);
                        void batchUpdate({ isPinned: !allPinned });
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 text-[#007AFF] hover:bg-[#F2F2F7] transition-colors w-full text-left"
                    >
                      <Pin size={16} className="shrink-0" />
                      <span className="text-xs font-medium truncate">
                        {(() => {
                          const sel = allCapsules.filter((c) => selectedIds.has(c.id));
                          return sel.length > 0 && sel.every((c) => c.isPinned)
                            ? 'Unpin'
                            : 'Pin to top';
                        })()}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sel = allCapsules.filter((c) => selectedIds.has(c.id));
                        const allStarred = sel.length > 0 && sel.every((c) => c.isStarred);
                        void batchUpdate({ isStarred: !allStarred });
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 text-[#007AFF] hover:bg-[#F2F2F7] transition-colors w-full text-left"
                    >
                      <Star
                        size={16}
                        className="shrink-0 text-[#FFCC00]"
                        fill={(() => {
                          const sel = allCapsules.filter((c) => selectedIds.has(c.id));
                          return sel.length > 0 && sel.every((c) => c.isStarred) ? '#FFCC00' : 'none';
                        })()}
                      />
                      <span className="text-xs font-medium truncate">
                        {(() => {
                          const sel = allCapsules.filter((c) => selectedIds.has(c.id));
                          return sel.length > 0 && sel.every((c) => c.isStarred)
                            ? 'Unstar'
                            : 'Star';
                        })()}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sel = allCapsules.filter((c) => selectedIds.has(c.id));
                        const allTodo = sel.length > 0 && sel.every((c) => c.isTodo);
                        void batchUpdate(
                          allTodo ? { isTodo: false, completed: false } : { isTodo: true },
                        );
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 text-[#007AFF] hover:bg-[#F2F2F7] transition-colors w-full text-left"
                    >
                      {(() => {
                        const sel = allCapsules.filter((c) => selectedIds.has(c.id));
                        const allTodo = sel.length > 0 && sel.every((c) => c.isTodo);
                        return allTodo ? (
                          <Square size={16} className="shrink-0 text-[#8E8E93]" />
                        ) : (
                          <CheckSquare size={16} className="shrink-0" />
                        );
                      })()}
                      <span className="text-xs font-medium truncate">
                        {(() => {
                          const sel = allCapsules.filter((c) => selectedIds.has(c.id));
                          return sel.length > 0 && sel.every((c) => c.isTodo)
                            ? 'Remove to-do'
                            : 'Set to-do';
                        })()}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchColorOpen(true)}
                      className="flex items-center gap-2 px-3 py-2.5 text-[#007AFF] hover:bg-[#F2F2F7] transition-colors w-full text-left"
                    >
                      <Palette size={16} className="shrink-0" />
                      <span className="text-xs font-medium truncate">Change color</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const first = allCapsules.find((c) => selectedIds.has(c.id));
                        const r = first?.reminder;
                        setBatchRemDate(r?.date ?? Date.now() + 86400000);
                        setBatchRemType(
                          r?.type && r.type !== 'none' ? r.type : 'once',
                        );
                        setBatchReminderOpen(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 text-[#007AFF] hover:bg-[#F2F2F7] transition-colors w-full text-left"
                    >
                      <Calendar size={16} className="shrink-0" />
                      <span className="text-xs font-medium truncate">Set reminder</span>
                    </button>
                  </>
                ) : null}
                
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
                    <button onClick={async () => {
                      const selectedNotes = allCapsules.filter(c => selectedIds.has(c.id));
                      const text = selectedNotes.map(c => `[${c.category || 'Note'}] ${plainTextFromContent(c.content)}`).join('\n\n---\n\n');
                      if (navigator.share) {
                        try { await navigator.share({ title: 'Shared Lumi Notes', text }); } catch (err) { console.log('Share error', err); }
                      } else {
                        navigator.clipboard.writeText(text);
                        alert('Copied all selected notes to clipboard!');
                      }
                    }} className="flex items-center gap-2 px-3 py-2.5 text-[#007AFF] hover:bg-[#F2F2F7] transition-colors w-full text-left"><Share2 size={16} className="shrink-0" /><span className="text-xs font-medium">Share</span></button>
                  </>
                )}

                <div className="h-px bg-[#E5E5EA] w-full my-1" />
                <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-2 px-3 py-2.5 text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors w-full text-left"><X size={16} className="shrink-0" /><span className="text-xs font-medium">Cancel</span></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {batchColorOpen && selectedIds.size > 0 ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-auto">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/40"
              onClick={() => setBatchColorOpen(false)}
            />
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#E5E5EA]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-black text-[#1D1D1F] mb-3">
                Change color ({selectedIds.size} notes)
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      void batchUpdate({ color });
                      setBatchColorOpen(false);
                    }}
                    className="h-9 w-9 rounded-full border-2 border-transparent hover:scale-110 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    void batchUpdate({ color: null as any });
                    setBatchColorOpen(false);
                  }}
                  className="h-9 w-9 rounded-full border-2 border-dashed border-[#D1D1D6] flex items-center justify-center text-[#8E8E93] bg-[#F2F2F7]"
                  title="Reset color"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setBatchColorOpen(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#F2F2F7] text-xs font-bold text-[#1D1D1F]"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}

        {batchReminderOpen && selectedIds.size > 0 ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-auto">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/40"
              onClick={() => setBatchReminderOpen(false)}
            />
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#E5E5EA] space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-black text-[#1D1D1F]">
                Reminder ({selectedIds.size} notes)
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1">
                  Time
                </div>
                <input
                  type="datetime-local"
                  value={
                    batchRemDate
                      ? new Date(
                          batchRemDate - new Date().getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={(e) => {
                    const d = new Date(e.target.value).getTime();
                    if (!isNaN(d)) setBatchRemDate(d);
                  }}
                  className="w-full px-3 py-2 bg-[#F2F2F7] rounded-xl text-xs border-none focus:ring-2 focus:ring-[#007AFF]/30"
                />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1">
                  Repeat
                </div>
                <select
                  value={batchRemType}
                  onChange={(e) =>
                    setBatchRemType(e.target.value as ReminderType)
                  }
                  className="w-full px-3 py-2 bg-[#F2F2F7] rounded-xl text-xs border-none"
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="none">No reminder</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    void batchUpdate({ reminder: undefined });
                    setBatchReminderOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] text-xs font-bold text-[#FF3B30]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next: ReminderConfig | undefined =
                      batchRemType === 'none' && !batchRemDate
                        ? undefined
                        : {
                            type:
                              batchRemType === 'none' && batchRemDate
                                ? 'once'
                                : batchRemType,
                            date:
                              batchRemDate || Date.now() + 86400000,
                          };
                    void batchUpdate({ reminder: next });
                    setBatchReminderOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#007AFF] text-xs font-bold text-white"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
                    if (e.key === 'Enter') {
                      if (!inputText.trim()) {
                        alert(
                          '请输入文字，然后点击右侧按钮创建便签；或按住右侧麦克风录制语音，系统会自动识别并创建便签。',
                        );
                        return;
                      }
                      handleCreateCapsule(inputText);
                      setInputText('');
                    }
                  }}
                  disabled={isProcessing}
                  className="bg-transparent border-none focus:ring-0 flex-1 text-base md:text-lg placeholder-[#8E8E93] dark:text-[#F2F2F7] outline-none py-3"
                />
                <button 
                  type="button"
                  title="创建便签"
                  onClick={() => {
                    if (!inputText.trim() && !isProcessing) {
                      alert(
                        '请输入文字，然后点击本按钮创建便签；或按住右侧麦克风录制语音，系统会自动识别并创建便签。',
                      );
                      return;
                    }
                    handleCreateCapsule(inputText);
                    setInputText('');
                  }}
                  disabled={isProcessing}
                  className="text-[#007AFF] p-2 hover:scale-110 active:scale-90 transition-all font-bold disabled:opacity-50"
                >
                  {isProcessing ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><RotateCcw size={20} /></motion.div> : <Check size={26} strokeWidth={3} />}
                </button>
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
        hideFeatures={showProFeaturesModal}
        onSuccess={() => {
           setShowPremiumModal(false);
           alert("Payment successful! You are now an Lumi Note Pro member.");
           const db = getDb(); // 按需初始化 Firebase
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
             const db = getDb(); // 按需初始化 Firebase
             setDoc(doc(db, 'users', user.uid), { isPremium: false }, { merge: true });
             alert('You have successfully downgraded from Pro mode.');
             setShowSettingsModal(false);
           }
        }}
      />

      <ProFeaturesModal
        isOpen={showProFeaturesModal}
        onClose={() => setShowProFeaturesModal(false)}
        user={user}
        onUpgrade={() => setShowPremiumModal(true)}
      />

      {/* Edge Swipe Panel Trigger (Mock Implementation for Edge Panel) */}
      {user && hasPremiumAccess(user) && (
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
  isCustom = false,
  count
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
  count?: number;
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
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className={`${isActive ? 'font-bold' : 'font-medium'} text-sm truncate`}>{label}</span>
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-2 ${isActive ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#8E8E93]'}`}>
                  {count}
                </span>
              )}
            </div>
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
  patchCapsule: (id: string, updates: Partial<Capsule>) => void;
  onRemovePermanently: () => void;
  allCategories: string[];
  allTags: string[];
  viewMode: 'grid' | 'list';
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onViewDetail: () => void;
  isPremium: boolean;
}

const formatNoteDateTime = (ts: number) => new Date(ts).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const repeatLabelForMenu = (r: any) => {
  if (!r || r.type === 'none') return 'None';
  if (r.type === 'once') return 'Once';
  if (r.type === 'custom') return `Every ${r.customInterval} ${r.customUnit}(s)`;
  return r.type.charAt(0).toUpperCase() + r.type.slice(1);
};

function reminderBellTitle(capsule: Capsule): string {
  const r = capsule.reminder;
  if (!r || r.type === 'none' || r.date == null) return 'Reminder';
  const when = new Date(r.date).toLocaleString();
  const schedule = repeatLabelForMenu(r);
  return [`When: ${when}`, `Schedule: ${schedule}`].join('\n');
}

const CapsuleItem = memo(function CapsuleItem({
  capsule,
  index,
  viewMode,
  patchCapsule,
  onRemovePermanently,
  allCategories,
  allTags,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onViewDetail,
  isPremium,
}: CapsuleItemProps) {
  const onUpdate = useCallback(
    (updates: Partial<Capsule>) => patchCapsule(capsule.id, updates),
    [patchCapsule, capsule.id],
  );
  const [showOptions, setShowOptions] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [isConfiguringCustom, setIsConfiguringCustom] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempReminderDate, setTempReminderDate] = useState<number | null>(capsule.reminder?.date || null);
  const [tempReminderType, setTempReminderType] = useState<ReminderType>(capsule.reminder?.type || 'none');
  
  const [tempCategory, setTempCategory] = useState(capsule.category || '');
  const [tempTags, setTempTags] = useState((capsule.tags || []).join(', '));
  
  const timerRef = useRef<number | null>(null);
  const longPressDetected = useRef(false);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <div className="flex items-center gap-2 md:gap-3 w-full mb-2.5 md:mb-3.5">
      <motion.div
        id={index === 0 ? "capsule-item-0" : undefined}
        title={[
          capsule.category ? `category: ${capsule.category}` : 'category: —',
          capsule.tags?.length
            ? `tags: ${capsule.tags.join(', ')}`
            : 'tags: —',
          capsule.isStarred ? 'starred' : 'not starred',
        ].join('\n')}
        className={cn(
          "w-full relative rounded-[24px] md:rounded-[28px] shadow-sm transition-all border flex group",
          viewMode === 'grid' ? "flex-col h-full min-h-[80px] md:min-h-[140px]" : "flex-row",
          "items-center gap-1.5 p-2.5 md:gap-3 md:p-6",
          isSelected ? "border-[#007AFF] shadow-2xl ring-[6px] ring-[#007AFF]/10 -translate-y-1" : "border-black/5 hover:border-black/10 hover:shadow-xl",
          capsule.isTodo &&
          capsule.completed &&
          !(showOptions || showColorPicker || showReminderPicker)
            ? "opacity-60"
            : "",
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
        {(showOptions || showColorPicker || showReminderPicker) && (
          <div
            className="fixed inset-0 z-[100]"
            aria-hidden
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowOptions(false);
              setShowColorPicker(false);
              setShowReminderPicker(false);
              setIsConfiguringCustom(false);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setShowOptions(false);
              setShowColorPicker(false);
              setShowReminderPicker(false);
              setIsConfiguringCustom(false);
            }}
          />
        )}

        {capsule.reminder && capsule.reminder.type !== 'none' && capsule.reminder.date && (
          <div
            className="absolute bottom-3 right-14 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-black/20 backdrop-blur-md border border-white/25 text-white shadow-md pointer-events-auto cursor-help"
            title={reminderBellTitle(capsule)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <Bell size={14} className={capsule.reminder.date <= Date.now() ? "text-red-200 animate-pulse" : "text-white"} />
          </div>
        )}

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
            capsule.isTodo && capsule.completed ? "line-through opacity-50 text-white/70" : "text-white",
            viewMode === 'grid' ? "whitespace-pre-wrap line-clamp-4" : "line-clamp-1"
          )}>
            {plainTextFromContent(capsule.content)}
          </div>
          
          <div className={cn(
            "flex flex-col gap-2 mt-4 shrink-0 w-full",
            viewMode === 'grid' ? "items-center" : ""
          )}>
            <div
              className={cn(
                "flex flex-col gap-1 w-full transition-all duration-200 max-h-0 opacity-0 overflow-hidden pointer-events-none",
                "group-hover:max-h-48 group-hover:opacity-100 group-hover:mt-2 group-hover:pointer-events-auto",
                viewMode === 'grid' ? "items-center text-center" : "",
              )}
            >
              <div
                className={cn(
                  'flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-white/95 leading-tight',
                  viewMode === 'grid' ? 'justify-center' : '',
                )}
              >
                <span className="uppercase tracking-wider text-white/80">
                  category:
                </span>
                <span>{capsule.category ?? '—'}</span>
                <span className="text-white/35 mx-0.5">|</span>
                <span className="uppercase tracking-wider text-white/80">tags:</span>
                <span>
                  {capsule.tags?.length ? capsule.tags.join(', ') : '—'}
                </span>
                <span className="text-white/35 mx-0.5">|</span>
                <span className="inline-flex items-center gap-1">
                  <Star
                    size={12}
                    className={
                      capsule.isStarred
                        ? 'text-[#FFCC00] fill-[#FFCC00]'
                        : 'text-white/55'
                    }
                  />
                  <span className="uppercase tracking-wider text-white/80">
                    {capsule.isStarred ? 'starred' : 'not starred'}
                  </span>
                </span>
              </div>
            </div>

            <div className={cn(
              "flex flex-wrap items-center gap-2",
              viewMode === 'grid' ? "justify-center" : ""
            )}>
              {capsule.attachments && capsule.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-white/60">
                  <Paperclip size={12} />
                  <span className="text-[10px] font-bold">{capsule.attachments.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div ref={menuRef} className={cn(
          "flex items-center gap-1 transition-opacity relative",
          showOptions || showColorPicker || showReminderPicker ? "z-[110]" : "z-40",
          viewMode === 'grid' ? "absolute bottom-4 right-4" : "flex-shrink-0",
          showOptions || showColorPicker || showReminderPicker
            ? "opacity-100"
            : viewMode === 'grid'
              ? "opacity-100 md:opacity-0 group-hover:opacity-100"
              : "opacity-100 md:opacity-0 group-hover:opacity-100"
        )}>
          <div className="flex items-center gap-1 bg-black/15 p-1 rounded-full">
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
                  className={cn(
                    "absolute rounded-xl shadow-2xl z-50 overflow-hidden text-[#1D1D1F] w-[200px] max-w-[70vw]",
                    "top-full mt-2 right-0 border border-[#E5E5EA] bg-[#ffffff]"
                  )}
                  style={{ backgroundColor: '#ffffff' }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >

                  <div className="p-3 space-y-3">
                    {/* GROUP 1: Category & Tags */}
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="px-3 py-1 text-[9px] uppercase font-black tracking-widest text-[#AEAEB2]">Category</div>
                        <input 
                          type="text"
                          value={tempCategory}
                          onChange={(e) => setTempCategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const t = tempCategory.trim();
                              onUpdate({ category: t || undefined });
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          onBlur={() => onUpdate({ category: tempCategory.trim() || undefined })}
                          className="w-full bg-[#F2F2F7] border-none rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-[#007AFF]/20"
                          placeholder="Category..."
                        />
                        {tempCategory && allCategories.filter(c => c.toLowerCase().includes(tempCategory.toLowerCase()) && c !== tempCategory).length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E5EA] rounded-xl shadow-xl z-[80] overflow-hidden">
                            {allCategories.filter(c => c.toLowerCase().includes(tempCategory.toLowerCase()) && c !== tempCategory).slice(0, 3).map(cat => (
                              <button key={cat} onClick={() => { setTempCategory(cat); onUpdate({ category: cat }); }} className="w-full text-left px-3 py-2 text-[11px] hover:bg-[#F2F2F7] font-semibold">{cat}</button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <div className="px-3 py-1 text-[9px] uppercase font-black tracking-widest text-[#AEAEB2]">Tags (comma separated)</div>
                        <input 
                          type="text"
                          value={tempTags}
                          onChange={(e) => setTempTags(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const parts = tempTags.split(',').map((t) => t.trim()).filter(Boolean);
                              onUpdate({ tags: parts.length ? parts : undefined });
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          onBlur={() => {
                            const parts = tempTags.split(',').map((t) => t.trim()).filter(Boolean);
                            onUpdate({ tags: parts.length ? parts : undefined });
                          }}
                          className="w-full bg-[#F2F2F7] border-none rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-[#007AFF]/20"
                          placeholder="Tags..."
                        />
                        {(() => {
                          const lastTag = tempTags.split(',').pop()?.trim() || '';
                          const suggestions = lastTag ? allTags.filter(t => t.toLowerCase().includes(lastTag.toLowerCase()) && !tempTags.split(',').map(x => x.trim()).includes(t)) : [];
                          return suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E5EA] rounded-xl shadow-xl z-[80] overflow-hidden">
                              {suggestions.slice(0, 3).map(tag => (
                                <button 
                                  key={tag} 
                                  onClick={() => {
                                    const parts = tempTags.split(',');
                                    parts.pop();
                                    const newVal = [...parts.map(p => p.trim()), tag].join(', ') + ', ';
                                    setTempTags(newVal);
                                    onUpdate({ tags: newVal.split(',').map(t => t.trim()).filter(Boolean) });
                                  }} 
                                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-[#F2F2F7] font-semibold"
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="h-px bg-[#F2F2F7] mx-2" />

                    {/* GROUP 2: Actions (single note only) */}
                    <div className="space-y-0.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdate({ isStarred: !capsule.isStarred }); setShowOptions(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F2F2F7] font-medium rounded-lg transition-colors"
                      >
                        <Star size={14} className={capsule.isStarred ? "text-[#FFCC00] fill-[#FFCC00]" : "text-[#8E8E93]"} />
                        {capsule.isStarred ? 'Unstar' : 'Star'}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowColorPicker(true); setShowOptions(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F2F2F7] font-medium rounded-lg transition-colors"
                      >
                        <Palette size={14} className="text-[#8E8E93]" />
                        Change Color
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowReminderPicker(true); setShowOptions(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F2F2F7] font-medium rounded-lg transition-colors"
                      >
                        <Calendar size={14} className="text-[#8E8E93]" />
                        Set Reminder
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdate({ isTodo: !capsule.isTodo }); setShowOptions(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F2F2F7] font-medium rounded-lg transition-colors"
                      >
                        {capsule.isTodo ? <Square size={14} className="text-[#8E8E93]" /> : <CheckSquare size={14} className="text-[#007AFF]" />}
                        {capsule.isTodo ? 'Cancel To-do' : 'Set To-do'}
                      </button>
                    </div>
                  </div>
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
                  className="absolute right-0 top-full mt-2 w-[200px] max-w-[70vw] bg-white border border-[#E5E5EA] rounded-2xl shadow-2xl z-50 p-3 text-[#1D1D1F]"
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
                className="absolute right-0 top-full mt-2 w-[200px] max-w-[70vw] bg-white border border-[#E5E5EA] rounded-xl shadow-2xl z-50 overflow-hidden"
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
});

function TagItem({ tag, tagFilter, setTagFilter, setCategoryFilter, removeTag, onRename, isMobile, setIsSidebarOpen, count }: any) {
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
          <div className="flex items-center justify-between flex-1 min-w-0">
            <span className={`${tagFilter === tag ? 'font-bold' : 'font-medium'} truncate`}>{tag}</span>
            {count !== undefined && count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-2 ${tagFilter === tag ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#8E8E93]'}`}>
                {count}
              </span>
            )}
          </div>
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
function ProFeaturesModal({ isOpen, onClose, user, onUpgrade }: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: any;
  onUpgrade: () => void;
}) {
  const features = [
    { id: 'ai', icon: '🤖', title: 'AI Smart Categorization', desc: 'Auto-detect categories.' },
    { id: 'rich', icon: '📝', title: 'Rich Text', desc: 'Advanced Tiptap editor.' },
    { id: 'voice', icon: '🎙️', title: 'Voice Capture', desc: 'Instant transcription.' },
    { id: 'native', icon: '🚀', title: 'Native App', desc: 'Android capture bar.' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[28px] w-full max-w-[320px] overflow-hidden shadow-2xl relative z-10"
      >
        <div className="bg-gradient-to-br from-[#AF52DE] to-[#FF2D55] p-5 text-white text-center relative">
           <button onClick={onClose} className="absolute right-3 top-3 w-7 h-7 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors">
             <X size={16} />
           </button>
           <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
             <CrownJewel size={28} />
           </div>
           <h2 className="text-xl font-black italic tracking-tight uppercase">Pro Features</h2>
        </div>

        <div className="p-4 space-y-3">
          {features.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#F2F2F7] transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{f.icon}</span>
                <div>
                  <h3 className="text-[13px] font-bold text-[#1D1D1F]">{f.title}</h3>
                  <p className="text-[10px] text-[#8E8E93] font-medium leading-none mt-0.5">{f.desc}</p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!user.isPremium) {
                    onUpgrade();
                  }
                }}
                className={cn(
                  "w-10 h-5 rounded-full relative transition-colors duration-200 p-0.5 flex-shrink-0",
                  user.isPremium ? "bg-[#34C759]" : "bg-[#C7C7CC]"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200",
                  user.isPremium ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
          ))}
          
          {!user.isPremium && (
            <button 
              onClick={onUpgrade}
              className="w-full bg-[#1D1D1F] text-white py-3 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all mt-2 uppercase tracking-widest"
            >
              Get Pro Access
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
