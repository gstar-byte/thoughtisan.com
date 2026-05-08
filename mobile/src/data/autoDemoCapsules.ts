import { PRESET_COLORS } from '../constants';
import type { Capsule } from '../types';

/** Seed capsules written to Firestore when library is empty (no id in seed). */
export type CapsuleSeed = Omit<Capsule, 'id'>;

export const AUTO_DEMO_SEED_KEY_PREFIX = '@idea_capsule/auto_demo_seeded_v1:';

export function autoDemoSeedStorageKey(uid: string): string {
  return `${AUTO_DEMO_SEED_KEY_PREFIX}${uid}`;
}

export const AUTO_DEMO_CAPSULES: CapsuleSeed[] = [
  {
    content:
      '🚀 Welcome to Idea Capsule! This sample note supports both list and grid layout.',
    category: 'Technology',
    tags: ['intro', 'welcome'],
    color: PRESET_COLORS[0],
    isTodo: false,
    completed: false,
    isArchived: false,
    isDeleted: false,
    attachments: [
      {
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2664&auto=format&fit=crop',
        type: 'image',
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    content: '🛒 Remember to buy milk and bread',
    category: 'Personal',
    tags: ['shopping', 'home'],
    color: PRESET_COLORS[1],
    isTodo: true,
    completed: false,
    isArchived: false,
    isDeleted: false,
    createdAt: Date.now() - 1000 * 60 * 60,
    updatedAt: Date.now() - 1000 * 60 * 60,
  },
  {
    content: '🎯 Finish the project presentation deck',
    category: 'Work',
    tags: ['important', 'deadline'],
    color: PRESET_COLORS[2],
    isTodo: true,
    completed: true,
    isArchived: true,
    isDeleted: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    updatedAt: Date.now() - 1000 * 60 * 30,
  },
  {
    content: '💡 Wild idea: an AI app that interprets dreams',
    category: 'Idea',
    tags: ['creative', 'startup', 'ai'],
    color: PRESET_COLORS[3],
    isTodo: false,
    completed: false,
    isArchived: false,
    isDeleted: false,
    createdAt: Date.now() - 1000 * 60 * 2,
    updatedAt: Date.now() - 1000 * 60 * 2,
  },
  {
    content: '🗑️ This sample is in Trash—open the Trash filter to see it.',
    category: 'Uncategorized',
    color: PRESET_COLORS[4],
    isTodo: false,
    completed: false,
    isArchived: false,
    isDeleted: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    content: '⏰ Book a dentist visit for tomorrow',
    category: 'Health',
    tags: ['appointment'],
    color: PRESET_COLORS[5],
    isTodo: true,
    completed: false,
    isArchived: false,
    isDeleted: false,
    reminder: { type: 'custom', date: Date.now() + 86400000 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
