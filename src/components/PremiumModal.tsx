import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { X, CheckCircle2, Zap, Video, Infinity as InfinityIcon, Sparkles, Crown, Cloud } from 'lucide-react';
import { UserProfile } from '../types';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSuccess: () => void;
}

export function PremiumModal({ isOpen, onClose, user, onSuccess }: PremiumModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#000000]/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg max-h-[90dvh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#007AFF] to-[#AF52DE] shrink-0 p-6 md:p-8 text-white relative">
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
             >
               <X size={20} />
             </button>
             
             <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-sm backdrop-blur-sm">
                <Zap className="w-6 h-6 md:w-8 md:h-8 text-white" fill="currentColor" />
             </div>
             
              <h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-tight">Upgrade to Pro</h2>
              <p className="text-white/80 font-medium text-sm md:text-base">Unlock the full power of Hue Note. One-time payment. Lifetime access.</p>
          </div>
          
          <div className="p-6 md:p-8 overflow-y-auto overflow-x-hidden custom-scrollbar">
             <div className="space-y-4 mb-8">
               <Feature icon={<Sparkles size={20} />} title="Unlimited AI Intent Recognition" description="Automatically create, categorize, and format notes using AI." />
               <Feature icon={<Cloud size={20} />} title="Multi-Platform Sync" description="Seamlessly sync your capsules across all devices." />
               <Feature icon={<Zap size={20} />} title="Quick Capture Shortcuts" description="Instantly create notes via edge swipe or volume keys." />
               <Feature icon={<Video size={20} />} title="Unlimited Media Attachments" description="Attach unlimited images and videos to your ideas." />
             </div>
             
             <div className="bg-[#F2F2F7] rounded-2xl p-6 mb-6 flex flex-col items-center">
                 <p className="text-[#8E8E93] text-sm font-bold uppercase tracking-wider mb-1">Lifetime Deal</p>
                 <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-[#1D1D1F]">$88.99</span>
                    <span className="text-xl font-bold text-[#8E8E93] line-through">$129.99</span>
                 </div>
             </div>
             
             {error && (
               <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                 {error}
               </div>
             )}
             
             {isProcessing ? (
               <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-bold text-[#8E8E93] animate-pulse">Processing your payment...</p>
               </div>
             ) : (
                <>
                  <PayPalScriptProvider options={{ 
                     clientId: (import.meta as any).env.VITE_PAYPAL_CLIENT_ID || "test", // Uses sandbox ID "test" by default
                     currency: "USD",
                     intent: "capture"
                  }}>
                    <PayPalButtons 
                      style={{ layout: "vertical", shape: "pill", color: "blue", label: "pay" }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [
                            {
                              description: "Hue Note Pro - Lifetime Deal",
                              amount: {
                                currency_code: "USD",
                                value: "88.99"
                              }
                            }
                          ]
                        });
                      }}
                      onApprove={async (data, actions) => {
                         setIsProcessing(true);
                         try {
                            if (actions.order) {
                               const details = await actions.order.capture();
                               if (details.status === "COMPLETED") {
                                  onSuccess();
                               } else {
                                  setError("Payment was not completed. Status: " + details.status);
                               }
                            }
                         } catch (err: any) {
                            setError(err.message || "An error occurred during payment processing.");
                         } finally {
                            setIsProcessing(false);
                         }
                      }}
                      onError={(err) => {
                         console.error("PayPal Checkout onError", err);
                         setError("Failed to load PayPal checkout. Check your connection or try again.");
                      }}
                    />
                  </PayPalScriptProvider>
                  
                  {/* Mock Payment Button for Testing */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#E5E5EA]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-[#8E8E93] font-medium">Or for testing</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onSuccess()}
                    className="w-full py-3.5 bg-gradient-to-r from-[#AF52DE] to-[#FF2D55] text-white rounded-full font-bold text-base shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Crown size={18} />
                    Unlock VIP for Free (Test Mode)
                  </button>
                </>
             )}
             <p className="text-center text-xs text-[#8E8E93] font-medium mt-4">Secure payment via PayPal. 100% money-back guarantee.</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex items-start gap-4">
       <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
         {icon}
       </div>
       <div>
         <h4 className="font-bold text-[#1D1D1F]">{title}</h4>
         <p className="text-sm text-[#8E8E93] leading-relaxed">{description}</p>
       </div>
    </div>
  );
}
