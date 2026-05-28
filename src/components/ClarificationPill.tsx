import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckSquare, RefreshCw, FileText, Settings, Star, Pin, Palette, Tag as TagIcon, Check } from 'lucide-react';
import { Capsule } from '../types';
import { PRESET_COLORS } from '../constants';

interface ClarificationPillProps {
  capsule: Capsule;
  onResolve: (updates: Partial<Capsule>) => void;
}

type RepeatType = 'none' | 'once' | 'daily' | 'weekly' | 'monthly';

function toLocalISOString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ClarificationPill({ capsule, onResolve }: ClarificationPillProps) {
  // Editable states initialized from capsule
  const [content, setContent] = useState(capsule.content || '');
  const [category, setCategory] = useState(capsule.category || '');
  const [tagsInput, setTagsInput] = useState((capsule.tags || []).join(', '));
  const [selectedColor, setSelectedColor] = useState(capsule.color || PRESET_COLORS[0]);
  const [isTodo, setIsTodo] = useState(capsule.isTodo || false);
  const [reminderType, setReminderType] = useState<RepeatType>(
    (capsule.reminder?.type as RepeatType) || 'none'
  );
  const [reminderDate, setReminderDate] = useState(() => {
    if (capsule.reminder?.date && typeof capsule.reminder.date === 'number') {
      return toLocalISOString(new Date(capsule.reminder.date));
    }
    const now = new Date();
    const tomorrowNine = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);
    return toLocalISOString(tomorrowNine);
  });
  const [isStarred, setIsStarred] = useState(capsule.isStarred || false);
  const [isPinned, setIsPinned] = useState(capsule.isPinned || false);

  const [showCustom, setShowCustom] = useState(false);

  const buildUpdates = (): Partial<Capsule> => {
    const updates: Partial<Capsule> = {
      content: content.trim() || capsule.content,
      isAmbiguous: false,
      clarificationPrompt: null,
    };
    if (category.trim()) updates.category = category.trim();
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) updates.tags = tags;
    updates.color = selectedColor;
    updates.isTodo = isTodo;
    if (isStarred) updates.isStarred = true;
    if (isPinned) updates.isPinned = true;
    if (reminderType !== 'none') {
      const d = new Date(reminderDate);
      if (!isNaN(d.getTime())) {
        updates.reminder = { type: reminderType, date: d.getTime() };
      }
    } else {
      updates.reminder = { type: 'none' };
    }
    return updates;
  };

  const handleQuickSelect = (type: 'today' | 'tomorrow' | 'dayafter' | 'todo' | 'everyday' | 'everyweek' | 'justnote') => {
    const now = new Date();

    if (type === 'today') {
      const todaySix = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
      if (todaySix.getTime() <= now.getTime()) {
        todaySix.setHours(todaySix.getHours() + 3);
      }
      setIsTodo(true);
      setReminderType('once');
      setReminderDate(toLocalISOString(todaySix));
    } else if (type === 'tomorrow') {
      const tomorrowNine = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);
      setIsTodo(true);
      setReminderType('once');
      setReminderDate(toLocalISOString(tomorrowNine));
    } else if (type === 'dayafter') {
      const dayAfterNine = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 9, 0, 0, 0);
      setIsTodo(true);
      setReminderType('once');
      setReminderDate(toLocalISOString(dayAfterNine));
    } else if (type === 'todo') {
      setIsTodo(true);
      setReminderType('none');
    } else if (type === 'everyday') {
      const dailyEight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0, 0);
      if (dailyEight.getTime() <= now.getTime()) {
        dailyEight.setDate(dailyEight.getDate() + 1);
      }
      setIsTodo(true);
      setReminderType('daily');
      setReminderDate(toLocalISOString(dailyEight));
    } else if (type === 'everyweek') {
      const nextMon = new Date(now);
      nextMon.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
      nextMon.setHours(9, 0, 0, 0);
      setIsTodo(true);
      setReminderType('weekly');
      setReminderDate(toLocalISOString(nextMon));
    } else if (type === 'justnote') {
      setIsTodo(false);
      setReminderType('none');
    }
  };

  const handleConfirm = () => {
    onResolve(buildUpdates());
  };

  const repeatOptions: { value: RepeatType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'once', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const commonCategories = ['Work', 'Personal', 'Health', 'Learning', 'Social', 'Finance', 'Errands', 'Travel', 'Ideas'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-3 p-3 bg-gradient-to-r from-[#F2F2F7] to-[#E5E5EA] dark:from-[#1C1C1E] dark:to-[#2C2C2E] rounded-2xl border border-[#D1D1D6]/40 dark:border-[#3A3A3C]/40 flex flex-col gap-2.5 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <span className="p-1.5 bg-[#007AFF]/10 text-[#007AFF] rounded-lg shrink-0">
          <Clock size={13} className="animate-pulse" />
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">Quick Settings</span>
          <span className="text-xs text-[#1D1D1F] dark:text-[#F2F2F7] font-medium leading-normal mt-0.5">
            {capsule.clarificationPrompt || "Review and adjust your note settings"}
          </span>
        </div>
      </div>

      {/* Content Edit */}
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">Title</label>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-xl px-3 py-2 text-xs text-[#1D1D1F] dark:text-[#F2F2F7] focus:ring-2 focus:ring-[#007AFF]/20 outline-none"
        />
      </div>

      {/* Category & Tags */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="pill-categories"
            className="w-full bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-xl px-3 py-2 text-xs text-[#1D1D1F] dark:text-[#F2F2F7] focus:ring-2 focus:ring-[#007AFF]/20 outline-none"
            placeholder="Category..."
          />
          <datalist id="pill-categories">
            {commonCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">Tags</label>
          <div className="relative">
            <TagIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-xl pl-7 pr-3 py-2 text-xs text-[#1D1D1F] dark:text-[#F2F2F7] focus:ring-2 focus:ring-[#007AFF]/20 outline-none"
              placeholder="tag1, tag2..."
            />
          </div>
        </div>
      </div>

      {/* Color Picker */}
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">Color</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                selectedColor === color ? 'border-[#007AFF] scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-1.5 mt-0.5">
        {/* Once Reminders */}
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 122, 255, 0.08)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickSelect('today')}
          className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#2C2C2E] text-[#007AFF] text-[11px] font-bold rounded-xl shadow-sm border border-[#E5E5EA] dark:border-[#3A3A3C] transition-colors"
        >
          <span>Today 6 PM</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 122, 255, 0.08)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickSelect('tomorrow')}
          className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#2C2C2E] text-[#007AFF] text-[11px] font-bold rounded-xl shadow-sm border border-[#E5E5EA] dark:border-[#3A3A3C] transition-colors"
        >
          <span>Tomorrow 9 AM</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 122, 255, 0.08)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickSelect('dayafter')}
          className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#2C2C2E] text-[#007AFF] text-[11px] font-bold rounded-xl shadow-sm border border-[#E5E5EA] dark:border-[#3A3A3C] transition-colors"
        >
          <span>Day After 9 AM</span>
        </motion.button>

        {/* Repeat Loops */}
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(175, 82, 222, 0.08)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickSelect('everyday')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#2C2C2E] text-[#AF52DE] text-[11px] font-bold rounded-xl shadow-sm border border-[#E5E5EA] dark:border-[#3A3A3C] transition-colors"
        >
          <RefreshCw size={10} />
          <span>Every Day 8 PM</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(175, 82, 222, 0.08)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickSelect('everyweek')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#2C2C2E] text-[#AF52DE] text-[11px] font-bold rounded-xl shadow-sm border border-[#E5E5EA] dark:border-[#3A3A3C] transition-colors"
        >
          <RefreshCw size={10} />
          <span>Every Mon 9 AM</span>
        </motion.button>

        {/* Task & Plain Note */}
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 59, 48, 0.08)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickSelect('todo')}
          className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-xl shadow-sm border transition-colors ${
            isTodo && reminderType === 'none'
              ? 'bg-[#FF3B30] text-white border-[#FF3B30]'
              : 'bg-white dark:bg-[#2C2C2E] text-[#FF3B30] border-[#E5E5EA] dark:border-[#3A3A3C]'
          }`}
        >
          <CheckSquare size={10} />
          <span>Just Todo</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(142, 142, 147, 0.08)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickSelect('justnote')}
          className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-xl shadow-sm border transition-colors ${
            !isTodo && reminderType === 'none'
              ? 'bg-[#8E8E93] text-white border-[#8E8E93]'
              : 'bg-white dark:bg-[#2C2C2E] text-[#8E8E93] border-[#E5E5EA] dark:border-[#3A3A3C]'
          }`}
        >
          <FileText size={10} />
          <span>Just Note</span>
        </motion.button>

        {/* Custom button */}
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(52, 199, 89, 0.08)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCustom(!showCustom)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl shadow-sm border transition-colors ${
            showCustom
              ? 'bg-[#34C759] text-white border-[#34C759]'
              : 'bg-white dark:bg-[#2C2C2E] text-[#34C759] border-[#E5E5EA] dark:border-[#3A3A3C]'
          }`}
        >
          <Settings size={10} />
          <span>Custom</span>
        </motion.button>

        {/* Star & Pin toggles */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsStarred(!isStarred)}
          className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-xl shadow-sm border transition-colors ${
            isStarred
              ? 'bg-[#FFCC00]/10 text-[#FF9500] border-[#FFCC00]/30'
              : 'bg-white dark:bg-[#2C2C2E] text-[#8E8E93] border-[#E5E5EA] dark:border-[#3A3A3C]'
          }`}
        >
          <Star size={10} className={isStarred ? 'fill-[#FFCC00]' : ''} />
          {isStarred ? 'Starred' : 'Star'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsPinned(!isPinned)}
          className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-xl shadow-sm border transition-colors ${
            isPinned
              ? 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/30'
              : 'bg-white dark:bg-[#2C2C2E] text-[#8E8E93] border-[#E5E5EA] dark:border-[#3A3A3C]'
          }`}
        >
          <Pin size={10} />
          {isPinned ? 'Pinned' : 'Pin'}
        </motion.button>
      </div>

      {/* Custom Options Panel */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-white dark:bg-[#2C2C2E] rounded-xl border border-[#E5E5EA] dark:border-[#3A3A3C] space-y-3">
              {/* Date & Time */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">Date & Time</label>
                <input
                  type="datetime-local"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-[#1D1D1F] dark:text-[#F2F2F7] focus:ring-2 focus:ring-[#007AFF]/20 outline-none"
                />
              </div>

              {/* Repeat */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">Repeat</label>
                <div className="flex flex-wrap gap-1.5">
                  {repeatOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setReminderType(opt.value);
                        if (opt.value !== 'none') setIsTodo(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        reminderType === opt.value
                          ? 'bg-[#007AFF] text-white border-[#007AFF]'
                          : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] border-[#E5E5EA] dark:border-[#3A3A3C] hover:bg-[#E5E5EA]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleConfirm}
        className="w-full py-2.5 bg-[#007AFF] text-white text-[12px] font-bold rounded-xl hover:bg-[#0051D5] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
      >
        <Check size={14} />
        Confirm & Create
      </motion.button>
    </motion.div>
  );
}