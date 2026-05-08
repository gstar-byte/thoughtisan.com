import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import {
  Archive,
  Bell,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  Calendar,
  Folder,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  Lock,
  LogOut,
  Mail,
  Mic,
  MoreVertical,
  Palette,
  PanelLeft,
  Plus,
  RotateCcw,
  Rocket,
  Search,
  Square,
  Tag as TagIcon,
  Trash,
  Trash2,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Capsule, FilterType, ReminderConfig, ReminderType, UserProfile } from './types';
import { PRESET_COLORS } from './constants';
import { categorizeThought } from './services/geminiService';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { CapsuleColorSheet } from './components/CapsuleColorSheet';
import { CapsuleReminderSheet } from './components/CapsuleReminderSheet';
import { LandingScreen } from './components/LandingScreen';
import { PremiumModalMobile } from './components/PremiumModalMobile';
import { SettingsModalMobile } from './components/SettingsModalMobile';
import {
  AUTO_DEMO_CAPSULES,
  autoDemoSeedStorageKey,
} from './data/autoDemoCapsules';
import {
  auth,
  db,
  addDoc,
  collection,
  createUserWithEmailAndPassword,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  sendPasswordResetEmail,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateDoc,
  updateProfile,
  where,
  writeBatch,
} from './lib/firebaseMobile';

function CrownJewel({ size = 24 }: { size?: number }) {
  const lift = Math.max(2, Math.round(size * 0.11));
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size,
          lineHeight: size,
          transform: [{ translateY: -lift }],
          textShadowColor: '#FFD700',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 6,
          includeFontPadding: false,
          ...(Platform.OS === 'android' ? ({ textAlignVertical: 'center' } as const) : null),
        }}
      >
        👑
      </Text>
    </View>
  );
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Notes' },
  { value: 'with-todo', label: 'Has To-do' },
  { value: 'without-todo', label: 'No To-do' },
  { value: 'completed-todo', label: 'Done To-do' },
  { value: 'with-reminder', label: 'Has Reminder' },
  { value: 'without-reminder', label: 'No Reminder' },
  { value: 'repeat-reminder', label: 'Repeat Reminder' },
  { value: 'pure-note', label: 'Pure Note' },
  { value: 'archived', label: 'Archived' },
  { value: 'trash', label: 'Trash' },
];

function normalizeReminder(raw: unknown): ReminderConfig | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const type = (typeof r.type === 'string' ? r.type : 'once') as ReminderType;
  const date = typeof r.date === 'number' ? r.date : undefined;
  return { type, date };
}

function hasActiveReminder(c: Capsule): boolean {
  return !!(c.reminder && c.reminder.type !== 'none');
}

/** Active reminder that repeats (not none / once). */
function hasRepeatReminder(c: Capsule): boolean {
  const t = c.reminder?.type;
  if (!t || t === 'none' || t === 'once') return false;
  return true;
}

/** Toggling to-do done alone must not change list order (no updatedAt bump). */
function shouldBumpUpdatedAt(updates: Partial<Capsule>): boolean {
  const keys = (Object.keys(updates) as (keyof Capsule)[]).filter(
    (k) => updates[k] !== undefined,
  );
  return !(keys.length === 1 && keys[0] === 'completed');
}

function formatNoteDateTime(ms?: number): string {
  if (ms == null || ms === 0) return '—';
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Short repeat label for the overflow menu. */
function repeatLabelForMenu(r: ReminderConfig | undefined): string {
  if (!r || r.type === 'none') return 'None';
  switch (r.type) {
    case 'once':
      return 'Once';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    case 'custom': {
      const u =
        r.customUnit === 'day'
          ? 'day(s)'
          : r.customUnit === 'week'
            ? 'week(s)'
            : r.customUnit === 'month'
              ? 'month(s)'
              : '';
      const iv = r.customInterval;
      if (iv != null && u) return `Every ${iv} ${u}`;
      return 'Custom';
    }
    default:
      return '—';
  }
}

function capsuleMenuMeta(c: Capsule) {
  const created = formatNoteDateTime(c.createdAt);
  const r = c.reminder;
  const reminderAt =
    r && r.type !== 'none' ? formatNoteDateTime(r.date) : 'Not set';
  const repeat = repeatLabelForMenu(r);
  return { created, reminderAt, repeat };
}

export default function IdeaCapsuleApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authProcessing, setAuthProcessing] = useState(false);

  const [capsules, setCapsules] = useState<Capsule[]>([]);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [editingCapsule, setEditingCapsule] = useState<Capsule | null>(null);
  const [editContent, setEditContent] = useState('');
  const [activeMenuCapsule, setActiveMenuCapsule] = useState<Capsule | null>(null);

  const [menuCategory, setMenuCategory] = useState('');
  const [menuTagInput, setMenuTagInput] = useState('');
  const [menuCategoryFocused, setMenuCategoryFocused] = useState(false);
  const [menuTagFocused, setMenuTagFocused] = useState(false);
  const categoryMenuSentRef = useRef('');
  const demoSeedInFlightRef = useRef(false);
  const activeMenuCapsuleRef = useRef<Capsule | null>(null);
  const menuTagInputRef = useRef('');
  activeMenuCapsuleRef.current = activeMenuCapsule;
  menuTagInputRef.current = menuTagInput;

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [colorPickerCapsule, setColorPickerCapsule] = useState<Capsule | null>(null);
  const [reminderTarget, setReminderTarget] = useState<Capsule | null>(null);

  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sidebarWidth = useMemo(() => {
    if (Platform.OS === 'web') {
      return Math.min(340, Math.max(220, Math.round(windowWidth * 0.62)));
    }
    return Math.min(200, Math.max(156, Math.round(windowWidth * 0.44)));
  }, [windowWidth]);
  const isWideWeb = Platform.OS === 'web' && windowWidth >= 680;

  const sidebarAnim = useState(() => new Animated.Value(-2000))[0];

  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: isSidebarOpen ? 0 : -sidebarWidth,
      duration: 250,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isSidebarOpen, sidebarAnim, sidebarWidth]);

  const userDocUnsubRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      userDocUnsubRef.current?.();
      userDocUnsubRef.current = undefined;
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        userDocUnsubRef.current = onSnapshot(
          userDocRef,
          (snap) => {
            if (snap.exists()) {
              const d = snap.data();
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                isPremium: d.isPremium || false,
              });
            } else {
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                isPremium: false,
              });
              void setDoc(
                userDocRef,
                {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  photoURL: firebaseUser.photoURL,
                  isPremium: false,
                  updatedAt: Date.now(),
                },
                { merge: true },
              );
            }
            setAuthLoading(false);
          },
          () => setAuthLoading(false),
        );
      } else {
        setUser(null);
        setCapsules([]);
        demoSeedInFlightRef.current = false;
        setAuthLoading(false);
      }
    });
    return () => {
      userDocUnsubRef.current?.();
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const q = query(collection(db, 'capsules'), where('userId', '==', uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<Capsule, 'id'>),
        id: d.id,
      }));
      const sorted = docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setCapsules(sorted);

      if (sorted.length > 0) {
        demoSeedInFlightRef.current = false;
        return;
      }

      void (async () => {
        if (demoSeedInFlightRef.current) return;
        const key = autoDemoSeedStorageKey(uid);
        try {
          const already = await AsyncStorage.getItem(key);
          if (already === '1') return;
          demoSeedInFlightRef.current = true;
          await AsyncStorage.setItem(key, '1');
          const batch = writeBatch(db);
          const now = Date.now();
          for (const seed of AUTO_DEMO_CAPSULES) {
            const ref = doc(collection(db, 'capsules'));
            batch.set(ref, {
              ...seed,
              userId: uid,
              createdAt: seed.createdAt ?? now,
              updatedAt: seed.updatedAt ?? now,
            });
          }
          await batch.commit();
        } catch (e) {
          console.error(e);
          demoSeedInFlightRef.current = false;
          await AsyncStorage.removeItem(key);
        }
      })();
    });
    return () => unsub();
  }, [user]);

  const sortedCapsules = useMemo(
    () => [...capsules].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [capsules],
  );

  const allTags = useMemo(
    () =>
      Array.from(new Set(sortedCapsules.flatMap((c) => c.tags || []))).sort(),
    [sortedCapsules],
  );

  const allCategories = useMemo(
    () =>
      Array.from(
        new Set(
          sortedCapsules.map((c) => c.category).filter(Boolean) as string[],
        ),
      ).sort(),
    [sortedCapsules],
  );

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    sortedCapsules.forEach((c) => {
      if (c.isArchived || c.isDeleted || !c.category) return;
      m.set(c.category, (m.get(c.category) || 0) + 1);
    });
    return m;
  }, [sortedCapsules]);

  const filteredCapsules = useMemo(() => {
    return sortedCapsules.filter((c) => {
      const matchesSearch =
        c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.tags?.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase()),
        ) ?? false);
      const matchesCategory =
        categoryFilter === 'all' || c.category === categoryFilter;
      const matchesTag = !tagFilter || (c.tags && c.tags.includes(tagFilter));

      if (filter === 'archived')
        return (
          matchesSearch &&
          matchesCategory &&
          matchesTag &&
          c.isArchived &&
          !c.isDeleted
        );
      if (filter === 'trash')
        return matchesSearch && matchesCategory && matchesTag && c.isDeleted;

      if (c.isArchived || c.isDeleted) return false;

      const matchesAdvanced = (() => {
        switch (filter) {
          case 'with-todo':
            return c.isTodo;
          case 'without-todo':
            return !c.isTodo;
          case 'completed-todo':
            return c.isTodo && c.completed;
          case 'with-reminder':
            return hasActiveReminder(c);
          case 'without-reminder':
            return !hasActiveReminder(c);
          case 'repeat-reminder':
            return hasRepeatReminder(c);
          case 'pure-note':
            return !c.isTodo && !hasActiveReminder(c);
          default:
            return true;
        }
      })();

      return matchesSearch && matchesCategory && matchesTag && matchesAdvanced;
    });
  }, [sortedCapsules, searchQuery, categoryFilter, tagFilter, filter]);

  const handleEmailAuth = async () => {
    setAuthError(null);
    setAuthProcessing(true);
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: email.split('@')[0] });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password')
        setAuthError('Invalid email or password.');
      else if (code === 'auth/email-already-in-use')
        setAuthError('Email already in use.');
      else if (code === 'auth/weak-password')
        setAuthError('Password is too weak.');
      else setAuthError('An error occurred. Please try again.');
    } finally {
      setAuthProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setAuthError('Please enter your email first.');
      return;
    }
    setAuthProcessing(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Sent', 'Check your email for a password reset link.');
      setAuthError(null);
    } catch {
      setAuthError('Could not send reset email.');
    } finally {
      setAuthProcessing(false);
    }
  };

  const updateCapsule = useCallback(
    async (id: string, updates: Partial<Capsule>) => {
      if (!user) return;
      const now = Date.now();
      const bump = shouldBumpUpdatedAt(updates);
      if (editingCapsule?.id === id) {
        setEditingCapsule((prev) =>
          prev
            ? { ...prev, ...updates, ...(bump ? { updatedAt: now } : {}) }
            : null,
        );
      }
      try {
        const docRef = doc(db, 'capsules', id);
        const clean: Record<string, unknown> = {};
        Object.entries(updates).forEach(([k, v]) => {
          clean[k] = v === undefined ? null : v;
        });
        if (bump) {
          clean.updatedAt = now;
        }
        await updateDoc(docRef, clean);
      } catch (e) {
        console.error(e);
        Alert.alert('Sync failed', 'Could not update the note. Check your network.');
      }
    },
    [user, editingCapsule?.id],
  );

  const updateCapsuleRef = useRef(updateCapsule);
  updateCapsuleRef.current = updateCapsule;
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      capsules.forEach((cap) => {
        if (!cap.reminder?.date || cap.completed || cap.isDeleted || cap.isArchived) return;
        if (cap.reminder.date > now) return;
        let shouldUpdate = false;
        const nextReminder = { ...cap.reminder };
        if (cap.reminder.type === 'custom' && cap.reminder.customInterval) {
          const mult =
            cap.reminder.customUnit === 'day'
              ? 86400000
              : cap.reminder.customUnit === 'week'
                ? 604800000
                : 2592000000;
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
        }
        if (shouldUpdate) void updateCapsuleRef.current(cap.id, { reminder: nextReminder });
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [capsules]);

  const removeCapsuleForever = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'capsules', id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCapsule = async (text: string) => {
    if (!text.trim() || !user) return;
    setIsProcessing(true);
    setInputText('');
    try {
      const { category, tags, refinedContent, isTodo, reminder } =
        await categorizeThought(text);
      const randomColor =
        PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
      const norm = normalizeReminder(reminder);

      await addDoc(collection(db, 'capsules'), {
        userId: user.uid,
        content: refinedContent,
        category: category || undefined,
        tags: tags && tags.length > 0 ? tags : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completed: false,
        isTodo: isTodo ?? false,
        isArchived: false,
        isDeleted: false,
        reminder: norm,
        color: randomColor,
      });
    } catch {
      const randomColor =
        PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
      await addDoc(collection(db, 'capsules'), {
        userId: user.uid,
        content: text,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completed: false,
        isTodo: false,
        isArchived: false,
        isDeleted: false,
        color: randomColor,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const batchUpdate = async (updates: Partial<Capsule>) => {
    if (!user || selectedIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      const bump = shouldBumpUpdatedAt(updates);
      selectedIds.forEach((id) => {
        batch.update(
          doc(db, 'capsules', id),
          bump ? { ...updates, updatedAt: now } : { ...updates },
        );
      });
      await batch.commit();
      setSelectedIds([]);
      setIsMultiSelectMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const batchRemovePermanently = async () => {
    if (!user || selectedIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => batch.delete(doc(db, 'capsules', id)));
      await batch.commit();
      setSelectedIds([]);
      setIsMultiSelectMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePremiumSuccess = async () => {
    if (!user?.uid) return;
    setShowPremiumModal(false);
    try {
      await setDoc(doc(db, 'users', user.uid), { isPremium: true }, { merge: true });
      Alert.alert('Success', 'You now have Idea Capsule Pro.');
    } catch {
      Alert.alert('Error', 'Could not update subscription status.');
    }
  };

  const handleDowngrade = () => {
    if (!user?.uid) return;
    Alert.alert(
      'Downgrade?',
      'This turns off Pro on your account (same as the web app: isPremium false).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              await setDoc(doc(db, 'users', user.uid), { isPremium: false }, { merge: true });
              setShowSettings(false);
              Alert.alert('Updated', 'You are on the free plan.');
            } catch {
              Alert.alert('Error', 'Could not update your account.');
            }
          },
        },
      ],
    );
  };

  const pickImageForCapsule = async (cap: Capsule) => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'Allow photo library access in Settings to attach images.',
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const isVideo = asset.type === 'video';

    if (!user?.isPremium && (isVideo || (asset.fileSize ?? 0) > 5 * 1024 * 1024)) {
      setShowPremiumModal(true);
      return;
    }

    if ((asset.fileSize ?? 0) > 800 * 1024 || isVideo) {
      const url = asset.uri;
      const next = [...(cap.attachments || []), { url, type: isVideo ? 'video' as const : 'image' as const }];
      await updateCapsule(cap.id, { attachments: next });
      setEditingCapsule((e) => (e?.id === cap.id ? { ...e, attachments: next } : e));
      return;
    }

    try {
      const base64 = await readAsStringAsync(asset.uri, {
        encoding: EncodingType.Base64,
      });
      const mime = asset.mimeType || 'image/jpeg';
      const dataUrl = `data:${mime};base64,${base64}`;
      const next = [...(cap.attachments || []), { url: dataUrl, type: 'image' as const }];
      await updateCapsule(cap.id, { attachments: next });
      setEditingCapsule((e) => (e?.id === cap.id ? { ...e, attachments: next } : e));
    } catch (e) {
      console.error(e);
    }
  };

  const removeAttachmentAt = async (index: number) => {
    const cap = editingCapsule;
    if (!cap) return;
    const prev = cap.attachments || [];
    if (index < 0 || index >= prev.length) return;
    const next = prev.filter((_, j) => j !== index);
    await updateCapsule(cap.id, { attachments: next.length > 0 ? next : [] });
    setEditingCapsule((e) =>
      e?.id === cap.id ? { ...e, attachments: next.length ? next : undefined } : e,
    );
  };

  const startVoice = () => {
    if (!user?.isPremium) {
      setShowPremiumModal(true);
      return;
    }
    Alert.alert('Coming soon', 'Voice capture on Android will arrive in a future update.');
  };

  const openMenu = (c: Capsule) => {
    setMenuCategory(c.category || '');
    categoryMenuSentRef.current = (c.category || '').trim();
    setMenuTagInput('');
    setMenuCategoryFocused(false);
    setMenuTagFocused(false);
    setActiveMenuCapsule(c);
  };

  /** Menu: category debounced sync (matches web—no extra Save tap). */
  useEffect(() => {
    if (!activeMenuCapsule || activeMenuCapsule.isDeleted) return;
    const trimmed = menuCategory.trim();
    if (trimmed === categoryMenuSentRef.current) return;
    const id = activeMenuCapsule.id;
    const t = setTimeout(() => {
      categoryMenuSentRef.current = trimmed;
      void updateCapsule(id, { category: trimmed || undefined });
      setActiveMenuCapsule((prev) =>
        prev?.id === id ? { ...prev, category: trimmed || undefined } : prev,
      );
    }, 360);
    return () => clearTimeout(t);
  }, [menuCategory, activeMenuCapsule?.id, activeMenuCapsule?.isDeleted, updateCapsule]);

  /** Commit pending tag text using refs (safe on menu dismiss / sub-sheets). Returns the capsule to use for follow-up updates. */
  const flushMenuTag = useCallback((): Capsule | null => {
    const cap = activeMenuCapsuleRef.current;
    if (!cap || cap.isDeleted) return null;
    const raw = menuTagInputRef.current.trim().replace(/^#/, '');
    if (!raw) return cap;
    let merged: Capsule = cap;
    setCapsules((s) => {
      const fromList = s.find((x) => x.id === cap.id) ?? cap;
      if (fromList.tags?.includes(raw)) {
        merged = fromList;
        return s;
      }
      const tags = [...(fromList.tags || []), raw];
      merged = { ...fromList, tags };
      void updateCapsule(cap.id, { tags });
      return s.map((x) => (x.id === cap.id ? { ...x, tags } : x));
    });
    setActiveMenuCapsule((prev) => (prev?.id === cap.id ? merged : prev));
    setMenuTagInput('');
    return merged;
  }, [updateCapsule]);

  const closeNotesMenu = useCallback(() => {
    flushMenuTag();
    setMenuTagInput('');
    setActiveMenuCapsule(null);
  }, [flushMenuTag]);

  /** Tags: pause-then-commit (avoid clearing mid-composition on some keyboards). */
  useEffect(() => {
    if (!activeMenuCapsule || activeMenuCapsule.isDeleted) return;
    if (!menuTagInput.trim()) return;
    const t = setTimeout(() => {
      flushMenuTag();
    }, 950);
    return () => clearTimeout(t);
  }, [menuTagInput, activeMenuCapsule?.id, activeMenuCapsule?.isDeleted, flushMenuTag]);

  const applyMenuCategoryPick = useCallback(
    (cat: string) => {
      if (!activeMenuCapsule || activeMenuCapsule.isDeleted) return;
      const trimmed = cat.trim();
      setMenuCategory(trimmed);
      categoryMenuSentRef.current = trimmed;
      void updateCapsule(activeMenuCapsule.id, { category: trimmed || undefined });
      setActiveMenuCapsule((prev) =>
        prev?.id === activeMenuCapsule.id ? { ...prev, category: trimmed || undefined } : prev,
      );
    },
    [activeMenuCapsule, updateCapsule],
  );

  const applyMenuTagPick = useCallback(
    (tag: string) => {
      if (!activeMenuCapsule || activeMenuCapsule.isDeleted) return;
      const val = tag.trim().replace(/^#/, '');
      if (!val) return;
      const id = activeMenuCapsule.id;
      let merged: Capsule = activeMenuCapsule;
      setCapsules((s) => {
        const cap = s.find((x) => x.id === id) ?? activeMenuCapsule;
        if (!cap) return s;
        if (cap.tags?.includes(val)) {
          merged = cap;
          return s;
        }
        const tags = [...(cap.tags || []), val];
        merged = { ...cap, tags };
        void updateCapsule(id, { tags });
        return s.map((x) => (x.id === id ? { ...x, tags } : x));
      });
      setActiveMenuCapsule((prev) => (prev?.id === id ? merged : prev));
    },
    [activeMenuCapsule, updateCapsule],
  );

  /** Category autocomplete while focused—prefix match. */
  const menuCategoryAutocomplete = useMemo(() => {
    if (!menuCategoryFocused) return [];
    const q = menuCategory.trim();
    if (!q) return [];
    const ql = q.toLowerCase();
    return allCategories
      .filter((c) => {
        const cl = c.toLowerCase();
        return cl.startsWith(ql) && cl !== ql;
      })
      .slice(0, 12);
  }, [menuCategoryFocused, menuCategory, allCategories]);

  /** Tags autocomplete while focused—prefix match. */
  const menuTagAutocomplete = useMemo(() => {
    if (!menuTagFocused || !activeMenuCapsule) return [];
    const raw = menuTagInput.trim().replace(/^#/, '');
    if (!raw) return [];
    const ql = raw.toLowerCase();
    const existing = new Set((activeMenuCapsule.tags || []).map((t) => t.toLowerCase()));
    return allTags
      .filter((t) => {
        const tl = t.toLowerCase();
        return tl.startsWith(ql) && !existing.has(tl) && tl !== ql;
      })
      .slice(0, 12);
  }, [menuTagFocused, menuTagInput, allTags, activeMenuCapsule]);

  const saveEdit = useCallback(() => {
    if (!editingCapsule) return;
    const id = editingCapsule.id;
    const content = editContent;
    setEditingCapsule(null);
    void updateCapsule(id, { content });
  }, [editingCapsule, editContent, updateCapsule]);

  useEffect(() => {
    if (editingCapsule) setEditContent(editingCapsule.content);
  }, [editingCapsule]);

  if (authLoading) {
    return (
      <View style={s.loadingRoot}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Zap size={40} color="#007AFF" style={{ position: 'absolute', opacity: 0.2 }} />
      </View>
    );
  }

  if (!user) {
    if (!showAuthScreen) {
      return (
        <LandingScreen
          onEmailAuth={() => setShowAuthScreen(true)}
          onFacebookPress={() =>
            Alert.alert(
              'Facebook',
              'Facebook sign-in needs the Facebook SDK wired to Firebase—use email or Google for now.',
            )
          }
        />
      );
    }

    return (
      <SafeAreaView style={s.authRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableOpacity style={s.backFab} onPress={() => setShowAuthScreen(false)}>
            <ChevronLeft size={22} color="#1D1D1F" />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={s.authScroll}>
            <Text style={s.authH}>{isRegistering ? 'Create account' : 'Welcome back'}</Text>
            <Text style={s.authHint}>
              {isRegistering
                ? 'Start capturing ideas everywhere'
                : 'Sign in to sync your capsules'}
            </Text>

            <Text style={s.label}>Email</Text>
            <View style={s.inputRow}>
              <Mail size={18} color="#8E8E93" />
              <TextInput
                style={s.input}
                placeholder="name@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={s.label}>Password</Text>
            <View style={s.inputRow}>
              <Lock size={18} color="#8E8E93" />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {authError ? <Text style={s.errTxt}>{authError}</Text> : null}

            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 16 }]}
              disabled={authProcessing}
              onPress={handleEmailAuth}
            >
              {authProcessing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.primaryBtnTxt}>
                  {isRegistering ? 'Sign up' : 'Sign in'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 12 }} onPress={handleResetPassword}>
              <Text style={{ color: '#007AFF', fontWeight: '700', fontSize: 13 }}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            <Text style={s.dividerLabel}>Or continue with</Text>
            <View style={s.socialRow}>
              <GoogleSignInButton variant="light" compact />
              <TouchableOpacity
                style={[s.socialBtn, { backgroundColor: '#1877F2' }]}
                onPress={() =>
                  Alert.alert(
                    'Facebook',
                    'Facebook sign-in is not set up yet—use email or Google.',
                  )
                }
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>f</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{ marginTop: 24 }} onPress={() => setIsRegistering(!isRegistering)}>
              <Text style={{ textAlign: 'center', color: '#8E8E93', fontSize: 13 }}>
                {isRegistering ? 'Already have an account?' : 'New here?'}{' '}
                <Text style={{ color: '#007AFF', fontWeight: '800' }}>
                  {isRegistering ? 'Sign in' : 'Create account'}
                </Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const filterLabel = FILTER_OPTIONS.find((f) => f.value === filter)?.label ?? 'All Notes';
  /** Match scrollBody.paddingHorizontal. */
  const scrollPadX = 8;
  const gridGap = 8;
  const gridColWidth = Math.max(
    136,
    Math.floor((windowWidth - scrollPadX * 2 - gridGap) / 2),
  );
  const menuSheetWidth = Math.min(236, windowWidth - 36);
  const filterMenuTop = insets.top + 60;
  /** Bottom padding so last card clears the composer bar visually. */
  const listBottomPad = 14;

  /** Sidebar category/tag is narrowing the list (not the top type filter pill). */
  const isSidebarListScopeActive =
    categoryFilter !== 'all' || tagFilter !== null;
  const topFilterShowsNA =
    isSidebarListScopeActive && filter !== 'archived' && filter !== 'trash';

  const filterChipLabel = (() => {
    if (topFilterShowsNA) return 'N/A';
    const lbl = filterLabel;
    return lbl.length > 11 ? `${lbl.slice(0, 10)}…` : lbl;
  })();

  return (
    <View
      style={[
        s.container,
        Platform.OS === 'web' && {
          width: '100%',
          minHeight: '100%',
          alignSelf: 'stretch',
        },
      ]}
    >
      <SafeAreaView
        style={[
          s.safeMain,
          isWideWeb && { maxWidth: 720, width: '100%', alignSelf: 'center' },
        ]}
        edges={['top']}
      >
        <View style={s.header}>
          <View style={s.sidebarOpenBtnWrap}>
            <TouchableOpacity
              onPress={() => setIsSidebarOpen(true)}
              hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
              style={s.headerIconHit}
              accessibilityRole="button"
              accessibilityLabel={
                isSidebarListScopeActive
                  ? 'Categories and tags — sidebar filter is active'
                  : 'Categories and tags'
              }
            >
              <PanelLeft size={24} color="#007AFF" />
            </TouchableOpacity>
            {isSidebarListScopeActive ? (
              <View style={s.sidebarScopeDot} pointerEvents="none" />
            ) : null}
          </View>
          <View style={s.searchWrap}>
            <Search size={17} color="#8E8E93" />
            <TextInput
              style={s.searchIn}
              placeholder="Search…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8E8E93"
            />
          </View>
          {topFilterShowsNA ? (
            <View
              style={[s.filterPillInline, s.filterPillInlineMuted]}
              accessibilityRole="text"
              accessibilityLabel="Filter not available while category or tag is selected in the sidebar"
            >
              <Text
                style={[s.filterPillInlineTxt, s.filterPillInlineTxtMuted]}
                numberOfLines={1}
              >
                {filterChipLabel}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={s.filterPillInline}
              onPress={() => setIsFilterMenuOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={s.filterPillInlineTxt} numberOfLines={1}>
                {filterChipLabel}
              </Text>
              <ChevronDown size={12} color="#8E8E93" />
            </TouchableOpacity>
          )}
          <View style={s.iconsRow}>
            <TouchableOpacity
              style={s.headerIconHit}
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
            >
              {viewMode === 'list' ? (
                <LayoutGrid size={23} color="#1D1D1F" />
              ) : (
                <LayoutList size={23} color="#1D1D1F" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerIconHit}
              onPress={() => setShowSettings(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Premium and settings"
            >
              <CrownJewel size={23} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={s.scrollFill}
          contentContainerStyle={[s.scrollBody, { paddingBottom: listBottomPad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
        >
          <View style={viewMode === 'grid' ? s.gridRow : s.listCol}>
            {filteredCapsules.map((item) => (
              <View
                key={item.id}
                style={[
                  viewMode === 'grid' ? s.cardWrapGrid : s.cardWrapList,
                  viewMode === 'grid' && { width: gridColWidth },
                ]}
              >
                {isMultiSelectMode && (
                  <TouchableOpacity
                    style={[
                      s.multiCheck,
                      viewMode === 'grid' && s.multiCheckFloating,
                    ]}
                    onPress={() => {
                      setSelectedIds((prev) =>
                        prev.includes(item.id)
                          ? prev.filter((x) => x !== item.id)
                          : [...prev, item.id],
                      );
                    }}
                  >
                    {selectedIds.includes(item.id) ? (
                      <View style={s.checkedCircle}>
                        <Check size={12} color="#FFF" />
                      </View>
                    ) : (
                      <View style={[s.uncheckCircle, viewMode === 'grid' && s.uncheckCircleOnCard]} />
                    )}
                  </TouchableOpacity>
                )}
                <CapsuleCard
                  item={item}
                  isGrid={viewMode === 'grid'}
                  isSelected={selectedIds.includes(item.id)}
                  isMulti={isMultiSelectMode}
                  onPress={() =>
                    isMultiSelectMode
                      ? setSelectedIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((x) => x !== item.id)
                            : [...prev, item.id],
                        )
                      : setEditingCapsule(item)
                  }
                  onLongPress={() => {
                    setIsMultiSelectMode(true);
                    setSelectedIds([item.id]);
                  }}
                  onMenu={() => openMenu(item)}
                  onToggleTodo={() =>
                    updateCapsule(item.id, { completed: !item.completed })
                  }
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={s.captureBarWrap}
        >
          <View style={[s.captureBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TouchableOpacity onPress={startVoice} style={s.iconBtn}>
              <Mic size={22} color="#1D1D1F" />
            </TouchableOpacity>
            <TextInput
              style={s.captureInput}
              placeholder="Capture an idea…"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleCreateCapsule(inputText)}
              placeholderTextColor="#8E8E93"
            />
            <TouchableOpacity
              style={s.fab}
              disabled={isProcessing}
              onPress={() => handleCreateCapsule(inputText)}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Plus size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {isSidebarOpen ? (
          <Pressable
            style={[s.sideOverlay, { left: sidebarWidth }]}
            onPress={() => setIsSidebarOpen(false)}
          />
        ) : null}
        <Animated.View
          pointerEvents={isSidebarOpen ? 'auto' : 'none'}
          style={[
            s.sidebar,
            { width: sidebarWidth, transform: [{ translateX: sidebarAnim }] },
          ]}
        >
          <View style={s.sideTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={s.logoBox}>
                <Rocket size={20} color="#FF3B30" />
              </View>
              <Text style={s.brand}>Idea Capsule</Text>
            </View>
            <View style={s.sideCloseBtnWrap}>
              <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                <ChevronLeft size={24} color="#C7C7CC" />
              </TouchableOpacity>
              {isSidebarListScopeActive ? (
                <View style={s.sidebarScopeDotSide} pointerEvents="none" />
              ) : null}
            </View>
          </View>
          <ScrollView
            style={s.sideScroll}
            contentContainerStyle={s.sideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <SidebarRow
              label="All Notes"
              count={sortedCapsules.filter((c) => !c.isArchived && !c.isDeleted).length}
              active={categoryFilter === 'all' && !tagFilter}
              onPress={() => {
                setCategoryFilter('all');
                setTagFilter(null);
                setIsSidebarOpen(false);
              }}
            />
            <TouchableOpacity
              style={s.sideSectionHead}
              onPress={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Folder size={20} color="#007AFF" strokeWidth={2.2} />
                <Text style={s.sideSectionTitle}>Categories</Text>
              </View>
              <ChevronDown
                size={18}
                color="#636366"
                style={{
                  transform: [{ rotate: isCategoriesExpanded ? '0deg' : '-90deg' }],
                }}
              />
            </TouchableOpacity>
            {isCategoriesExpanded &&
              allCategories.map((cat) => (
                <SidebarRow
                  key={cat}
                  label={cat}
                  count={categoryCounts.get(cat) || 0}
                  isSub
                  active={categoryFilter === cat && !tagFilter}
                  onPress={() => {
                    setCategoryFilter(cat);
                    setTagFilter(null);
                    setIsSidebarOpen(false);
                  }}
                />
              ))}
            <TouchableOpacity
              style={s.sideSectionHead}
              onPress={() => setIsTagsExpanded(!isTagsExpanded)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TagIcon size={20} color="#007AFF" strokeWidth={2.2} />
                <Text style={s.sideSectionTitle}>Tags</Text>
              </View>
              <ChevronDown
                size={18}
                color="#636366"
                style={{ transform: [{ rotate: isTagsExpanded ? '0deg' : '-90deg' }] }}
              />
            </TouchableOpacity>
            {isTagsExpanded &&
              allTags.map((t) => (
                <SidebarRow
                  key={t}
                  label={t}
                  count={sortedCapsules.filter((c) => c.tags?.includes(t)).length}
                  isSub
                  active={tagFilter === t}
                  onPress={() => {
                    setTagFilter(tagFilter === t ? null : t);
                    setIsSidebarOpen(false);
                  }}
                />
              ))}
          </ScrollView>
          <View style={[s.sideFooter, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <View style={s.userCard}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={s.userAvatar} />
              ) : (
                <View style={s.userAvatarPlaceholder}>
                  <UserIcon size={20} color="#FFF" />
                </View>
              )}
              <View style={s.userMeta}>
                <View style={s.userTitleRow}>
                  <Text style={s.userName} numberOfLines={1}>
                    {user.displayName || 'User'}
                  </Text>
                  {user.isPremium ? (
                    <View style={s.userProBadge}>
                      <Text style={s.userProCrown}>👑</Text>
                      <Text style={s.userProTxt}>PRO</Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={s.signOutRow}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    void signOut(auth);
                  }}
                >
                  <LogOut size={12} color="#FF3B30" />
                  <Text style={s.signOutTxt}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        <Modal transparent visible={isFilterMenuOpen} animationType="fade">
          <View style={s.modalRoot}>
            <Pressable
              style={[StyleSheet.absoluteFillObject, s.modalBackdrop]}
              onPress={() => setIsFilterMenuOpen(false)}
            />
            <View
              style={[StyleSheet.absoluteFillObject, s.modalFront]}
              pointerEvents="box-none"
            >
              <View style={[s.filterMenuBox, { top: filterMenuTop, right: 12 }]} pointerEvents="auto">
                {FILTER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={s.mItem}
                    onPress={() => {
                      setFilter(opt.value);
                      setIsFilterMenuOpen(false);
                    }}
                  >
                    <Text
                      style={[s.mItemTxt, filter === opt.value && { color: '#007AFF' }]}
                    >
                      {opt.label}
                    </Text>
                    {filter === opt.value ? <Check size={16} color="#007AFF" /> : null}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={!!activeMenuCapsule} animationType="fade">
          <View style={s.modalRoot}>
            <Pressable
              style={[StyleSheet.absoluteFillObject, s.modalBackdrop]}
              onPress={closeNotesMenu}
            />
            <View
              style={[StyleSheet.absoluteFillObject, s.modalFrontCenter]}
              pointerEvents="box-none"
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: windowHeight * 0.85, width: menuSheetWidth }}
                contentContainerStyle={{ paddingBottom: 6 }}
                pointerEvents="auto"
              >
                <View style={[s.threeDotsBox, { width: menuSheetWidth }]}>
                  {activeMenuCapsule ? (
                    <>
                      <View style={s.menuMetaBox}>
                        {(() => {
                          const m = capsuleMenuMeta(activeMenuCapsule);
                          return (
                            <>
                              <Text style={s.menuMetaLine}>Created: {m.created}</Text>
                              <Text style={s.menuMetaLine}>Reminder: {m.reminderAt}</Text>
                              <Text style={s.menuMetaLine}>Repeat: {m.repeat}</Text>
                            </>
                          );
                        })()}
                      </View>
                      <View style={s.menuHairline} />
                    </>
                  ) : null}
                  {activeMenuCapsule && !activeMenuCapsule.isDeleted ? (
                    <>
                      <TouchableOpacity
                        style={s.mItem}
                        onPress={() => {
                          const merged = flushMenuTag();
                          const cap = merged ?? activeMenuCapsule;
                          if (cap) setColorPickerCapsule(cap);
                          setMenuTagInput('');
                          setActiveMenuCapsule(null);
                        }}
                      >
                        <Palette size={18} color="#1D1D1F" />
                        <Text style={s.mItemTxt}>Change Color</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.mItem}
                        onPress={() => {
                          const merged = flushMenuTag();
                          const cap = merged ?? activeMenuCapsule;
                          if (cap) setReminderTarget(cap);
                          setMenuTagInput('');
                          setActiveMenuCapsule(null);
                        }}
                      >
                        <Calendar size={18} color="#1D1D1F" />
                        <Text style={s.mItemTxt}>Set Reminder</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.mItem}
                        onPress={() => {
                          if (!activeMenuCapsule) return;
                          const merged = flushMenuTag() ?? activeMenuCapsule;
                          void updateCapsule(merged.id, {
                            isTodo: !merged.isTodo,
                          });
                          setMenuTagInput('');
                          setActiveMenuCapsule(null);
                        }}
                      >
                        {activeMenuCapsule.isTodo ? (
                          <Square size={18} color="#1D1D1F" />
                        ) : (
                          <CheckSquare size={18} color="#1D1D1F" />
                        )}
                        <Text style={s.mItemTxt}>
                          {activeMenuCapsule.isTodo ? 'Cancel To-do' : 'Set To-do'}
                        </Text>
                      </TouchableOpacity>

                      <View style={s.menuHairline} />
                      <View style={[s.menuSec, s.menuSecTightTop]}>
                        <Text style={s.menuSecTxt}>Category</Text>
                      </View>
                      <View style={s.menuInputWrap}>
                        <TextInput
                          style={s.menuInput}
                          value={menuCategory}
                          onChangeText={setMenuCategory}
                          placeholder="Category — type to match past ones"
                          placeholderTextColor="#8E8E93"
                          onFocus={() => setMenuCategoryFocused(true)}
                          onBlur={() => {
                            setTimeout(() => setMenuCategoryFocused(false), 400);
                          }}
                        />
                      </View>
                      {menuCategoryAutocomplete.length > 0 ? (
                        <View style={s.menuAutocompleteBox}>
                          {menuCategoryAutocomplete.map((cat) => (
                            <TouchableOpacity
                              key={cat}
                              style={s.menuAutocompleteRow}
                              onPress={() => {
                                setMenuCategoryFocused(false);
                                applyMenuCategoryPick(cat);
                              }}
                            >
                              <Text style={s.menuAutocompleteRowTxt} numberOfLines={1}>
                                {cat}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                      <View style={s.menuSec}>
                        <Text style={s.menuSecTxt}>Tags</Text>
                      </View>
                      {(activeMenuCapsule.tags || []).length > 0 ? (
                        <View style={s.menuTagChipsRow}>
                          {(activeMenuCapsule.tags || []).map((t) => (
                            <View key={t} style={s.menuTagChip}>
                              <Text style={s.menuTagChipTxt}>#{t}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                      <View style={s.menuInputWrap}>
                        <TextInput
                          style={s.menuInput}
                          placeholder="Tag — type to match past tags"
                          placeholderTextColor="#8E8E93"
                          value={menuTagInput}
                          onChangeText={setMenuTagInput}
                          onFocus={() => setMenuTagFocused(true)}
                          onBlur={() => {
                            setTimeout(() => setMenuTagFocused(false), 450);
                          }}
                          onSubmitEditing={() => flushMenuTag()}
                          blurOnSubmit={false}
                          returnKeyType="done"
                        />
                      </View>
                      {menuTagAutocomplete.length > 0 ? (
                        <View style={s.menuAutocompleteBox}>
                          {menuTagAutocomplete.map((tag) => (
                            <TouchableOpacity
                              key={tag}
                              style={s.menuAutocompleteRow}
                              onPress={() => {
                                setMenuTagFocused(false);
                                applyMenuTagPick(tag);
                              }}
                            >
                              <Text style={s.menuAutocompleteRowTxt} numberOfLines={1}>
                                #{tag}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      <View style={s.menuHairline} />
                      <TouchableOpacity
                        style={s.mItem}
                        onPress={() => {
                          if (!activeMenuCapsule) return;
                          const merged = flushMenuTag() ?? activeMenuCapsule;
                          void updateCapsule(merged.id, {
                            isArchived: !merged.isArchived,
                          });
                          setMenuTagInput('');
                          setActiveMenuCapsule(null);
                        }}
                      >
                        {activeMenuCapsule.isArchived ? (
                          <RotateCcw size={18} color="#1D1D1F" />
                        ) : (
                          <Archive size={18} color="#1D1D1F" />
                        )}
                        <Text style={s.mItemTxt}>
                          {activeMenuCapsule.isArchived ? 'Restore' : 'Archive'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.mItem}
                        onPress={() => {
                          if (!activeMenuCapsule) return;
                          const merged = flushMenuTag() ?? activeMenuCapsule;
                          void updateCapsule(merged.id, { isDeleted: true });
                          setMenuTagInput('');
                          setActiveMenuCapsule(null);
                        }}
                      >
                        <Trash size={18} color="#FF3B30" />
                        <Text style={[s.mItemTxt, { color: '#FF3B30' }]}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  ) : activeMenuCapsule?.isDeleted ? (
                    <>
                      <View style={s.menuHairline} />
                      <TouchableOpacity
                        style={s.mItem}
                        onPress={() => {
                          if (!activeMenuCapsule) return;
                          flushMenuTag();
                          void updateCapsule(activeMenuCapsule.id, { isDeleted: false });
                          setMenuTagInput('');
                          setActiveMenuCapsule(null);
                        }}
                      >
                        <RotateCcw size={18} color="#1D1D1F" />
                        <Text style={s.mItemTxt}>Restore</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.mItem}
                        onPress={() => {
                          if (!activeMenuCapsule) return;
                          flushMenuTag();
                          void removeCapsuleForever(activeMenuCapsule.id);
                          setMenuTagInput('');
                          setActiveMenuCapsule(null);
                        }}
                      >
                        <Trash2 size={18} color="#FF3B30" />
                        <Text style={[s.mItemTxt, { color: '#FF3B30' }]}>Delete Forever</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={!!colorPickerCapsule} animationType="fade">
          <View style={s.modalRoot}>
            <Pressable
              style={[StyleSheet.absoluteFillObject, s.modalBackdrop]}
              onPress={() => setColorPickerCapsule(null)}
            />
            <View
              style={[StyleSheet.absoluteFillObject, s.modalFrontCenter]}
              pointerEvents="box-none"
            >
              <View style={{ width: Math.min(340, menuSheetWidth) }} pointerEvents="auto">
                {colorPickerCapsule ? (
                  <CapsuleColorSheet
                    capsule={colorPickerCapsule}
                    onSelectPreset={(hex) => {
                      void updateCapsule(colorPickerCapsule.id, { color: hex });
                      setColorPickerCapsule(null);
                    }}
                    onReset={() => {
                      void updateCapsule(colorPickerCapsule.id, { color: undefined });
                      setColorPickerCapsule(null);
                    }}
                    onCustomColor={(hex) => {
                      void updateCapsule(colorPickerCapsule.id, { color: hex });
                    }}
                    onClose={() => setColorPickerCapsule(null)}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={!!reminderTarget} animationType="fade">
          <View style={s.modalRoot}>
            <Pressable
              style={[StyleSheet.absoluteFillObject, s.modalBackdropStrong]}
              onPress={() => setReminderTarget(null)}
            />
            <View
              style={[StyleSheet.absoluteFillObject, s.modalFrontCenter]}
              pointerEvents="box-none"
            >
              <View style={{ width: Math.min(400, windowWidth - 32) }} pointerEvents="auto">
                {reminderTarget ? (
                  <CapsuleReminderSheet
                    capsule={reminderTarget}
                    onClose={() => setReminderTarget(null)}
                    onSave={(r) => {
                      void updateCapsule(reminderTarget.id, { reminder: r });
                    }}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </Modal>

        {isMultiSelectMode ? (
          <View style={s.floatingBar}>
            <Text style={s.barTitle}>{selectedIds.length} selected</Text>
            <View style={s.divider} />
            {filter === 'trash' ? (
              <>
                <TouchableOpacity style={s.mItem} onPress={() => batchUpdate({ isDeleted: false })}>
                  <Text style={{ color: '#34C759', fontWeight: '700' }}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.mItem} onPress={() => batchRemovePermanently()}>
                  <Trash2 size={16} color="#FF3B30" />
                  <Text style={{ color: '#FF3B30' }}>Delete forever</Text>
                </TouchableOpacity>
              </>
            ) : filter === 'archived' ? (
              <>
                <TouchableOpacity style={s.mItem} onPress={() => batchUpdate({ isArchived: false })}>
                  <Text style={{ color: '#34C759', fontWeight: '700' }}>Unarchive</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.mItem} onPress={() => batchUpdate({ isDeleted: true })}>
                  <Trash size={16} color="#FF3B30" />
                  <Text style={{ color: '#FF3B30' }}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={s.mItem}
                  onPress={() =>
                    setSelectedIds(filteredCapsules.map((c) => c.id))
                  }
                >
                  <CheckSquare size={16} color="#007AFF" />
                  <Text style={{ color: '#007AFF', fontWeight: '700' }}>Select all</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.mItem} onPress={() => batchUpdate({ isArchived: true })}>
                  <Archive size={16} color="#8E8E93" />
                  <Text style={{ color: '#8E8E93' }}>Archive</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.mItem} onPress={() => batchUpdate({ isDeleted: true })}>
                  <Trash size={16} color="#FF3B30" />
                  <Text style={{ color: '#FF3B30' }}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={s.divider} />
            <TouchableOpacity
              style={s.mItem}
              onPress={() => {
                setIsMultiSelectMode(false);
                setSelectedIds([]);
              }}
            >
              <X size={16} color="#8E8E93" />
              <Text style={{ color: '#8E8E93' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <SettingsModalMobile
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          user={user}
          onUpgrade={() => {
            setShowPremiumModal(true);
          }}
          onDowngrade={handleDowngrade}
        />

        <PremiumModalMobile
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          user={user}
          onSuccess={handlePremiumSuccess}
        />

        <Modal transparent visible={!!editingCapsule} animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.editKeyboardWrap}
          >
            <Pressable
              style={[StyleSheet.absoluteFillObject, s.editBackdropTint]}
              onPress={() => setEditingCapsule(null)}
            />
            <View style={s.editBoxCenter} pointerEvents="box-none">
              <View style={s.editBox}>
              <View
                style={[
                  s.editHeader,
                  { backgroundColor: editingCapsule?.color || '#FFB900' },
                ]}
              >
                <Text style={s.editTitle}>Edit note</Text>
                <TouchableOpacity onPress={() => setEditingCapsule(null)}>
                  <X size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
              <ScrollView style={s.editBody}>
                <TextInput
                  style={s.editInput}
                  multiline
                  value={editContent}
                  onChangeText={setEditContent}
                />
                {editingCapsule?.attachments?.map((a, i) => (
                  <View
                    key={`att-${editingCapsule.id}-${i}-${a.url.slice(0, 24)}`}
                    style={{ marginTop: 12 }}
                  >
                    <View style={{ position: 'relative' }}>
                      {a.type === 'image' ? (
                        <Image
                          source={{ uri: a.url }}
                          style={{ width: '100%', height: 180, borderRadius: 12 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: '100%',
                            height: 120,
                            borderRadius: 12,
                            backgroundColor: 'rgba(0,0,0,0.75)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: '#FFF', fontWeight: '800' }}>Video</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        accessibilityLabel="Remove attachment"
                        onPress={() => removeAttachmentAt(i)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          borderRadius: 16,
                          padding: 6,
                        }}
                      >
                        <X size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={s.editFooter}>
                <TouchableOpacity onPress={() => editingCapsule && pickImageForCapsule(editingCapsule)}>
                  <ImageIcon size={22} color="#8E8E93" />
                </TouchableOpacity>
                <TouchableOpacity style={s.doneBtnBlack} onPress={saveEdit}>
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>Done</Text>
                </TouchableOpacity>
              </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

function CapsuleCard({
  item,
  isGrid,
  isSelected,
  isMulti,
  onPress,
  onLongPress,
  onMenu,
  onToggleTodo,
}: {
  item: Capsule;
  isGrid: boolean;
  isSelected: boolean;
  isMulti: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onMenu: () => void;
  onToggleTodo: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        isGrid ? s.cardGrid : s.cardList,
        isGrid && s.cardGridFill,
        { backgroundColor: item.color || PRESET_COLORS[0] },
        isSelected && { borderWidth: 2, borderColor: '#007AFF' },
      ]}
    >
      {item.isTodo ? (
        <View style={s.cardCheckCol}>
          <TouchableOpacity
            style={[s.checkOuter, item.completed && s.checkOuterDone]}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleTodo();
            }}
          >
            {item.completed ? <Check size={11} color="rgba(0,0,0,0.62)" strokeWidth={3} /> : null}
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={s.cardBody}>
        <Text
          style={[
            s.cardText,
            item.isTodo && item.completed ? s.cardTextDone : null,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.content}
        </Text>
        <View style={s.cardFoot}>
          <View style={s.badge}>
            <View style={s.dot} />
            <Text style={s.badgeTxt}>
              {(item.category || 'Note').toUpperCase()}
            </Text>
          </View>
          {hasActiveReminder(item) ? (
            <Bell
              size={12}
              color="rgba(255,255,255,0.95)"
              strokeWidth={2.5}
              style={{ marginLeft: 8 }}
            />
          ) : null}
        </View>
      </View>
      {!isMulti ? (
        <View style={s.cardMenuCol}>
          <TouchableOpacity
            onPress={(e) => {
              (e as { stopPropagation?: () => void }).stopPropagation?.();
              onMenu();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={isGrid ? 16 : 18} color="#FFF" style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function SidebarRow({
  label,
  count,
  active,
  isSub,
  onPress,
}: {
  label: string;
  count: number;
  active?: boolean;
  isSub?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.sideRow, active && s.sideActive]}
      onPress={onPress}
    >
      <View
        style={[
          s.mark,
          active
            ? { backgroundColor: '#FFF' }
            : { backgroundColor: '#8E8E93', opacity: 0.3 },
        ]}
      />
      <Text style={[s.sideLabel, active && { color: '#FFF' }]}>{label}</Text>
      <Text style={[s.sideCount, active && { color: '#FFF' }]}>{count}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  loadingRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  landingRoot: { flex: 1, backgroundColor: '#FFF' },
  landingInner: { flex: 1, padding: 32, justifyContent: 'center' },
  logoBoxL: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  landingTitle: { fontSize: 32, fontWeight: '900', color: '#1D1D1F' },
  landingSub: { fontSize: 15, color: '#8E8E93', marginTop: 12, marginBottom: 32, lineHeight: 22 },
  authRoot: { flex: 1, backgroundColor: '#FFF' },
  backFab: {
    position: 'absolute',
    top: 8,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authScroll: { padding: 24, paddingTop: 56 },
  authH: { fontSize: 26, fontWeight: '900', color: '#1D1D1F' },
  authHint: { color: '#8E8E93', marginTop: 8, marginBottom: 24, fontWeight: '600' },
  label: { fontSize: 10, fontWeight: '900', color: '#8E8E93', letterSpacing: 1.2, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 10,
  },
  input: { flex: 1, height: 48, fontSize: 15, fontWeight: '600' },
  errTxt: { color: '#FF3B30', fontSize: 13, fontWeight: '600', marginTop: 8 },
  dividerLabel: {
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 12,
    fontSize: 10,
    fontWeight: '900',
    color: '#8E8E93',
    letterSpacing: 1.5,
  },
  socialRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  socialBtn: {
    width: 56,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  safeMain: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchWrap: {
    flex: 1,
    minWidth: 72,
    minHeight: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchIn: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#1D1D1F',
    paddingVertical: 10,
  },
  filterPillInline: {
    flexShrink: 0,
    maxWidth: 118,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterPillInlineTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D1D1F',
    flexShrink: 1,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  headerIconHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarOpenBtnWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  sidebarScopeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  sideCloseBtnWrap: {
    position: 'relative',
    padding: 4,
    marginRight: -4,
  },
  sidebarScopeDotSide: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  filterPillInlineMuted: {
    backgroundColor: '#E9E9ED',
    borderColor: '#D8D8DC',
  },
  filterPillInlineTxtMuted: {
    color: '#8E8E93',
  },
  scrollFill: { flex: 1 },
  scrollBody: { paddingHorizontal: 8, paddingTop: 2, flexGrow: 1 },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-start',
    alignContent: 'flex-start',
  },
  listCol: { flexDirection: 'column' },
  cardWrapList: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
  },
  cardWrapGrid: {
    position: 'relative',
    marginBottom: 8,
  },
  cardGrid: {
    minHeight: 96,
    maxHeight: 120,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
    elevation: 4,
    overflow: 'hidden',
  },
  cardGridFill: { width: '100%', alignSelf: 'stretch' },
  cardList: {
    flex: 1,
    minHeight: 62,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  cardCheckCol: {
    width: 32,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingLeft: 4,
    paddingRight: 6,
  },
  cardMenuCol: {
    width: 36,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkOuter: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkOuterDone: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.92)',
  },
  cardText: {
    color: 'rgba(255,255,255,0.96)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  cardTextDone: {
    textDecorationLine: 'line-through',
    opacity: 0.72,
  },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 6,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '72%',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFF' },
  badgeTxt: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 9,
    fontWeight: '500',
    flexShrink: 1,
  },
  multiCheck: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  multiCheckFloating: {
    position: 'absolute',
    left: 4,
    top: '50%',
    marginTop: -18,
    zIndex: 20,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C7C7CC' },
  uncheckCircleOnCard: {
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFF',
    zIndex: 2000,
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  sideScroll: { flex: 1 },
  sideScrollContent: { paddingBottom: 12 },
  sideFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 10,
    paddingBottom: 6,
    flexShrink: 0,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    padding: 12,
  },
  userAvatar: { width: 40, height: 40, borderRadius: 12 },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMeta: { flex: 1, minWidth: 0 },
  userTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1D1D1F' },
  userProBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#AF52DE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  userProCrown: { fontSize: 10, lineHeight: 10, marginTop: -1 },
  userProTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  signOutTxt: { fontSize: 10, fontWeight: '800', color: '#FF3B30' },
  sideOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1500,
  },
  sideTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, justifyContent: 'space-between' },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: { fontSize: 18, fontWeight: '900' },
  sideSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sideSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1D1D1F',
    letterSpacing: 0.2,
  },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  sideActive: { backgroundColor: '#007AFF' },
  mark: { width: 6, height: 6, borderRadius: 3 },
  sideLabel: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '800', color: '#8E8E93' },
  sideCount: { fontSize: 11, fontWeight: '900', color: '#C7C7CC' },
  modalRoot: { flex: 1, backgroundColor: 'transparent' },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.35)' },
  modalBackdropStrong: { backgroundColor: 'rgba(0,0,0,0.45)' },
  modalFront: {},
  modalFrontCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  backdropBase: { flex: 1, zIndex: 10000 },
  backdropBaseCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10000 },
  backdropDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', zIndex: 10000 },
  editKeyboardWrap: { flex: 1 },
  editBackdropTint: { backgroundColor: 'rgba(0,0,0,0.45)' },
  editBoxCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  filterMenuBox: {
    position: 'absolute',
    top: 56,
    right: 8,
    width: 220,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 10,
    elevation: 10,
  },
  threeDotsBox: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 6,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  mItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, gap: 10 },
  mItemTxt: { fontSize: 14, fontWeight: '600', color: '#1D1D1F' },
  menuSec: { backgroundColor: '#F2F2F7', paddingVertical: 5, paddingHorizontal: 10, marginTop: 2 },
  menuSecTightTop: { marginTop: 0 },
  menuSecTxt: { fontSize: 10, fontWeight: '800', color: '#8E8E93', letterSpacing: 0.8 },
  menuMetaBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    gap: 3,
  },
  menuMetaLine: { fontSize: 12, fontWeight: '500', color: '#636366', lineHeight: 16 },
  menuHairline: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 5 },
  menuInputWrap: { paddingHorizontal: 8, paddingVertical: 2 },
  menuInput: { backgroundColor: '#F2F2F7', height: 34, borderRadius: 8, paddingHorizontal: 10, fontSize: 13 },
  menuTagChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 2,
  },
  menuTagChip: {
    backgroundColor: 'rgba(0,122,255,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.22)',
  },
  menuTagChipTxt: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
  menuAutocompleteBox: {
    maxHeight: 160,
    marginHorizontal: 8,
    marginBottom: 4,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  menuAutocompleteRow: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  menuAutocompleteRowTxt: { fontSize: 14, fontWeight: '600', color: '#1D1D1F' },
  floatingBar: {
    position: 'absolute',
    right: 16,
    top: 120,
    width: 168,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 8,
    elevation: 15,
    zIndex: 2000,
  },
  barTitle: { fontSize: 12, fontWeight: '800', padding: 8 },
  divider: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 4 },
  settingsSheet: { width: '92%', backgroundColor: '#FFF', borderRadius: 32, padding: 24, maxHeight: '85%' },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mTitle: { fontSize: 20, fontWeight: '900' },
  uStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 22,
    marginBottom: 20,
  },
  aBig: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E9E9EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  proPanel: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#F2F2F7', marginBottom: 20 },
  proLblRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', padding: 12 },
  doneBtn: { alignItems: 'center', padding: 10 },
  doneTxt: { color: '#007AFF', fontWeight: '800' },
  editBox: { width: '90%', backgroundColor: '#FFF', borderRadius: 16, maxHeight: '88%' },
  editHeader: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  editTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  editBody: { padding: 12, maxHeight: 440 },
  editInput: { minHeight: 130, fontSize: 17, fontWeight: '500', color: '#1D1D1F' },
  editFooter: {
    minHeight: 52,
    backgroundColor: '#F9F9F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  doneBtnBlack: { backgroundColor: '#1D1D1F', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  captureBarWrap: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  captureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: '#FFF',
    gap: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  captureInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
  },
  secondaryBtnTxt: { color: '#FF3B30', fontWeight: '800', fontSize: 15 },
  colorSheet: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'stretch',
  },
  colorSheetHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 4,
    fontWeight: '600',
  },
  colorGridScroll: { flexGrow: 1, paddingBottom: 8 },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  colorDotSelected: { borderWidth: 3, borderColor: '#007AFF' },
  colorCloseBtn: { alignItems: 'center', marginTop: 14, paddingVertical: 8 },
});
