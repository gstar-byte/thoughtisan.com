import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Crown, LogOut, CheckCircle2, Moon, Cloud, BarChart3, ChevronRight, X, User as UserIcon } from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpgradeClick: () => void;
  onDowngradeClick?: () => void;
}

export function SettingsModal({ isOpen, onClose, user, onUpgradeClick, onDowngradeClick }: SettingsModalProps) {
  // Sync toggle (mock internal state)
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [reportsEnabled, setReportsEnabled] = useState(true);
  const [edgeSwipeEnabled, setEdgeSwipeEnabled] = useState(true);
  const [isConfirmingDowngrade, setIsConfirmingDowngrade] = useState(false);

  if (!isOpen) return null;

  const handleProToggle = (currentValue: boolean, setter: (val: boolean) => void) => {
     if (!user?.isPremium) {
        onUpgradeClick();
        return;
     }
     setter(!currentValue);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-[#F2F2F7] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-xl font-bold tracking-tight">Settings</h2>
            <button 
               onClick={onClose}
               className="p-2 bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-full transition-colors text-[#8E8E93]"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
             
             {/* Account Section */}
             <div className="bg-white rounded-2xl p-4">
                <div className="flex items-center gap-4">
                   {user?.photoURL ? (
                      <img src={user?.photoURL} alt="User avatar" className="w-14 h-14 rounded-full border border-[#E5E5EA]" referrerPolicy="no-referrer" />
                   ) : (
                      <div className="w-14 h-14 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
                         <UserIcon size={24} />
                      </div>
                   )}
                   <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#1D1D1F] text-lg truncate">{user?.displayName || 'User'}</h3>
                      <p className="text-sm text-[#8E8E93] truncate">{user?.email}</p>
                   </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
                   <div className="flex items-center justify-between">
                     <div>
                       <span className="text-sm font-bold text-[#8E8E93] uppercase tracking-wider block mb-0.5">Account Tier</span>
                       {user?.isPremium ? (
                          <div className="flex items-center gap-1.5 text-[#AF52DE]">
                              <Crown size={18} fill="currentColor" />
                              <span className="font-bold">Idea Capsule Pro</span>
                           </div>
                       ) : (
                          <span className="font-bold text-[#1D1D1F]">Free Plan</span>
                       )}
                     </div>
                     {!user?.isPremium ? (
                        <button onClick={onUpgradeClick} className="bg-gradient-to-r from-[#007AFF] to-[#00C6FF] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform">
                          Upgrade
                        </button>
                     ) : isConfirmingDowngrade ? (
                        <div className="flex items-center gap-2">
                           <button onClick={() => setIsConfirmingDowngrade(false)} className="text-xs text-[#8E8E93] hover:underline font-bold px-2 py-2">Cancel</button>
                           <button onClick={() => { onDowngradeClick?.(); setIsConfirmingDowngrade(false); }} className="bg-[#FF3B30] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform">
                             Confirm
                           </button>
                        </div>
                     ) : (
                        <button onClick={() => setIsConfirmingDowngrade(true)} className="bg-transparent border border-[#FF3B30] text-[#FF3B30] px-4 py-2 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform hover:bg-red-50">
                          Downgrade
                        </button>
                     )}
                   </div>
                </div>
             </div>

             {/* Pro Features */}
             <div className="bg-white rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-[#1D1D1F] flex items-center gap-2">
                   <Crown size={16} className="text-[#FFD60A]" fill="currentColor" />
                   <span className="text-white text-sm font-bold tracking-tight">Pro Features</span>
                </div>
                
                <div className="divide-y divide-[#E5E5EA]">
                   <ToggleRow 
                     icon={<Cloud size={20} />} 
                     title="Multi-Device Sync" 
                     description="Sync your capsules across all devices in real-time."
                     checked={user?.isPremium ? syncEnabled : false}
                     onChange={() => handleProToggle(syncEnabled, setSyncEnabled)}
                     requiresPro={!user?.isPremium}
                   />
                   <ToggleRow 
                     icon={<BarChart3 size={20} />} 
                     title="AI Weekly & Monthly Reports" 
                     description="Get AI-generated insights on your captured thoughts."
                     checked={user?.isPremium ? reportsEnabled : false}
                     onChange={() => handleProToggle(reportsEnabled, setReportsEnabled)}
                     requiresPro={!user?.isPremium}
                   />
                   <ToggleRow 
                     icon={<ChevronRight size={20} />} 
                     title="Edge Swipe Quick Capture" 
                     description="Slide from the right edge to capture instantly."
                     checked={user?.isPremium ? edgeSwipeEnabled : false}
                     onChange={() => handleProToggle(edgeSwipeEnabled, setEdgeSwipeEnabled)}
                     requiresPro={!user?.isPremium}
                   />
                </div>
             </div>

             <div className="pt-2 pb-6 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-[#8E8E93]">
                   <SettingsIcon size={14} />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Idea Capsule v1.0.4</span>
                </div>
                <button onClick={onClose} className="text-sm font-bold text-[#007AFF] hover:underline">Done</button>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ToggleRow({ icon, title, description, checked, onChange, requiresPro }: any) {
  return (
    <div className="p-4 flex items-center justify-between gap-4">
       <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#F2F2F7] text-[#1D1D1F] flex items-center justify-center shrink-0">
             {icon}
          </div>
          <div>
             <h4 className="font-bold text-[#1D1D1F] flex items-center gap-2">
               {title}
               {requiresPro && <Crown size={12} className="text-[#AF52DE]" />}
             </h4>
             <p className="text-xs text-[#8E8E93] leading-tight">{description}</p>
          </div>
       </div>
       <button 
          onClick={onChange}
          className={`w-12 h-7 rounded-full p-1 transition-colors flex shrink-0 ${checked ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}`}
       >
          <motion.div 
            className="w-5 h-5 bg-white rounded-full shadow-sm"
            animate={{ x: checked ? 20 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
       </button>
    </div>
  );
}
