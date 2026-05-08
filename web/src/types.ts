export type ReminderType = 'none' | 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface ReminderConfig {
  type: ReminderType;
  date?: number; // Timestamp for specific reminder time
  customInterval?: number; // e.g. every 2
  customUnit?: 'day' | 'week' | 'month'; // Days, weeks, or months
}

export interface Capsule {
  id: string;
  userId?: string; // Owner ID
  content: string;
  category?: string;
  createdAt: number;
  updatedAt?: number;
  completed: boolean;
  isTodo: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  color?: string; // Hex color for custom override
  tags?: string[];
  reminder?: ReminderConfig;
  attachments?: { url: string; type: 'image' | 'video' }[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPremium?: boolean;
}

export type FilterType = 
  | 'all' 
  | 'with-todo' 
  | 'without-todo' 
  | 'completed-todo' 
  | 'with-reminder' 
  | 'without-reminder' 
  | 'repeat-reminder'
  | 'pure-note'
  | 'archived' 
  | 'trash';
