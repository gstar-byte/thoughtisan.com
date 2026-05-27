import React from 'react';
import { motion } from 'motion/react';
import { Clock, CheckSquare, RefreshCw, FileText } from 'lucide-react';
import { Capsule } from '../types';

interface ClarificationPillProps {
  capsule: Capsule;
  onResolve: (updates: Partial<Capsule>) => void;
}

export function ClarificationPill({ capsule, onResolve }: ClarificationPillProps) {
  if (!capsule.isAmbiguous) return null;

  const handleQuickSelect = (type: 'today' | 'tomorrow' | 'todo' | 'everyday' | 'everyweek' | 'justnote') => {
    const now = new Date();
    
    if (type === 'today') {
      const todaySix = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
      if (todaySix.getTime() <= now.getTime()) {
        todaySix.setHours(todaySix.getHours() + 3); // Default to 9 PM if 6 PM passed
      }
      onResolve({
        isTodo: true,
        reminder: {
          type: 'once',
          date: todaySix.getTime()
        },
        isAmbiguous: false,
        clarificationPrompt: null
      });
    } else if (type === 'tomorrow') {
      const tomorrowNine = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);
      onResolve({
        isTodo: true,
        reminder: {
          type: 'once',
          date: tomorrowNine.getTime()
        },
        isAmbiguous: false,
        clarificationPrompt: null
      });
    } else if (type === 'todo') {
      onResolve({
        isTodo: true,
        reminder: {
          type: 'none'
        },
        isAmbiguous: false,
        clarificationPrompt: null
      });
    } else if (type === 'everyday') {
      const dailyEight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0, 0);
      if (dailyEight.getTime() <= now.getTime()) {
        dailyEight.setDate(dailyEight.getDate() + 1); // Tomorrow 8 PM
      }
      onResolve({
        isTodo: true,
        reminder: {
          type: 'daily',
          date: dailyEight.getTime()
        },
        isAmbiguous: false,
        clarificationPrompt: null
      });
    } else if (type === 'everyweek') {
      const nextMon = new Date(now);
      nextMon.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
      nextMon.setHours(9, 0, 0, 0);
      onResolve({
        isTodo: true,
        reminder: {
          type: 'weekly',
          date: nextMon.getTime()
        },
        isAmbiguous: false,
        clarificationPrompt: null
      });
    } else if (type === 'justnote') {
      onResolve({
        isTodo: false,
        reminder: {
          type: 'none'
        },
        isAmbiguous: false,
        clarificationPrompt: null
      });
    }
  };

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
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">Ambient Intelligence</span>
          <span className="text-xs text-[#1D1D1F] dark:text-[#F2F2F7] font-medium leading-normal mt-0.5">
            {capsule.clarificationPrompt || "Would you like to set a reminder, repeat loop, or keep it as a note?"}
          </span>
        </div>
      </div>

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
          className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#2C2C2E] text-[#FF3B30] text-[11px] font-bold rounded-xl shadow-sm border border-[#E5E5EA] dark:border-[#3A3A3C] transition-colors"
        >
          <CheckSquare size={10} />
          <span>Just Todo</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(142, 142, 147, 0.08)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickSelect('justnote')}
          className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#2C2C2E] text-[#8E8E93] text-[11px] font-bold rounded-xl shadow-sm border border-[#E5E5EA] dark:border-[#3A3A3C] transition-colors"
        >
          <FileText size={10} />
          <span>Just Note</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
