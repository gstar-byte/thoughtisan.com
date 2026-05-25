import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AppLogo } from './AppLogo';
import { 
  Zap, Mic, CheckSquare, Sparkles, ArrowRight, Palette, Clock, CalendarDays, 
  Smartphone, Monitor, Tablet, Apple, Play, Facebook, Star, Pin, LayoutGrid, List, 
  Tag, Bell, Square, ChevronRight, Volume1 
} from 'lucide-react';
import { auth, googleProvider, facebookProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { Helmet } from 'react-helmet-async';

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login error", error);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await signInWithPopup(auth, facebookProvider);
    } catch (error) {
      console.error("Facebook login error", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#007AFF] selection:text-white overflow-x-hidden">
      <Helmet>
        <title>Thoughtisan – Lightning-fast Notes, Todos & Reminders</title>
        <meta name="description" content="⚡ Lightning-fast notes, todos & reminders. Thought + Artisan = Capture every thought, crafted. 📝 ✅ 🔔 All in one." />
        <meta property="og:title" content="Thoughtisan – Lightning-fast Notes, Todos & Reminders" />
        <meta property="og:description" content="⚡ Lightning-fast notes, todos & reminders. Thought + Artisan = Capture every thought, crafted." />
        <meta property="og:image" content="https://thoughtisan.com/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Thoughtisan – Lightning-fast Notes, Todos & Reminders" />
        <meta name="twitter:description" content="⚡ Lightning-fast notes, todos & reminders. Thought + Artisan = Capture every thought, crafted." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "url": "https://thoughtisan.com",
            "name": "Thoughtisan",
            "description": "Capture your thoughts, crafted.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://thoughtisan.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "email": "mailto:hello@thoughtisan.com",
              "url": "https://thoughtisan.com/contact",
              "contactType": "customer support"
            }
          })}
        </script>
      </Helmet>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppLogo className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight">Thoughtisan</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block">
              Log in
            </button>
            <button onClick={onLogin} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Sign up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 relative overflow-hidden">
        {/* Animated Mesh Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-[#007AFF]/30 to-purple-600/30 blur-[120px] rounded-full mix-blend-screen animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-rose-500/30 to-orange-500/30 blur-[130px] rounded-full mix-blend-screen animate-blob animation-delay-2000" />
          <div className="absolute -bottom-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-500/20 to-teal-400/20 blur-[150px] rounded-full mix-blend-screen animate-blob animation-delay-4000" />
          
          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
              <Sparkles size={14} className="text-[#007AFF]" />
              <span className="text-xs font-semibold tracking-wider uppercase">⚡ Lightning Fast · 📝 Notes · ✅ Todos · 🔔 Reminders</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[1.05]">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Thought</span> +
              <span className="text-white">isan</span><br />
              <span className="text-4xl md:text-6xl lg:text-7xl text-white/80">Capture instantly.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              ⚡ Lightning-fast notes, todos & reminders. Thought + Artisan = Capture every thought, crafted beautifully.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button onClick={onLogin} className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all flex items-center justify-center gap-2 group">
              Start Free Crafting
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={handleGoogleLogin} className="w-full sm:w-auto px-6 py-4 bg-white/10 border border-white/20 text-white backdrop-blur-md rounded-full font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Sign in with Google - Secure and Fast Authentication" className="w-5 h-5 bg-white rounded-full p-0.5" />
              Google
            </button>
            <button onClick={handleFacebookLogin} className="w-full sm:w-auto px-6 py-4 bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] hover:text-white backdrop-blur-md rounded-full font-bold text-lg hover:bg-[#1877F2]/80 transition-all flex items-center justify-center gap-2">
              <Facebook className="w-5 h-5" />
              Facebook
            </button>
          </motion.div>

          {/* App Download Links (Demo) */}
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.8, delay: 0.5 }}
             className="flex flex-col items-center border-t border-white/10 pt-8 mt-8"
          >
            <p className="text-sm text-white/40 font-medium mb-6 uppercase tracking-widest">Coming soon on mobile</p>
            <div className="flex flex-wrap justify-center gap-4">
               <a href="#demo-ios" className="flex items-center gap-3 px-5 py-3 bg-[#1D1D1F] border border-white/10 rounded-2xl hover:bg-black transition-colors w-[180px]">
                 <Apple size={28} className="text-white" />
                 <div className="text-left flex flex-col text-white">
                   <span className="text-[10px] opacity-70 leading-none mb-1">Download on the</span>
                   <span className="text-sm font-bold leading-none">App Store</span>
                 </div>
               </a>
               <a href="#demo-android" className="flex items-center gap-3 px-5 py-3 bg-[#1D1D1F] border border-white/10 rounded-2xl hover:bg-black transition-colors w-[180px]">
                 <Play size={24} className="text-white" fill="currentColor" />
                 <div className="text-left flex flex-col text-white">
                   <span className="text-[10px] opacity-70 leading-none mb-1">GET IT ON</span>
                   <span className="text-sm font-bold leading-none">Google Play</span>
                 </div>
               </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Brand Philosophy Section */}
      <section className="py-20 px-6 relative z-10 bg-gradient-to-b from-transparent to-black/30">
        <div className="max-w-5xl mx-auto border-t border-b border-white/10 py-16 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 text-left">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 text-white">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Thought</span> + Artisan <br />
              <span className="text-white/60">= Thoughtisan</span>
            </h2>
            <p className="text-[#007AFF] font-semibold text-lg uppercase tracking-wider">⚡ Lightning Fast · 📝 Notes · ✅ Todos · 🔔 Reminders</p>
          </div>
          <div className="flex-1 text-left text-white/70 space-y-4 text-base font-light leading-relaxed">
            <p>
              <strong className="text-white">Thought</strong> = Every idea, note, task, and reminder you need to capture.
            </p>
            <p>
              <strong className="text-white">Artisan</strong> = Crafted with precision. Beautiful, fast, and reliable.
            </p>
            <p>
              <strong>Thoughtisan</strong> = All your notes, todos, and reminders — captured instantly, crafted beautifully. One app for every thought.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Section 1: Lightning Fast Capture & Voice Input */}
      <section className="py-24 px-6 relative overflow-hidden bg-black/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBC02D]/10 border border-[#FBC02D]/20 mb-6">
                <Zap className="text-[#FBC02D]" size={16} />
                <span className="text-[#FBC02D] text-sm font-semibold">Lightning Fast</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
                Capture ideas the instant they strike
              </h2>
              <p className="text-xl text-white/60 mb-8 leading-relaxed">
                Never let a moment slip away. Type your thoughts in seconds, or speak them naturally — we'll handle the rest.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-12 h-12 bg-[#FBC02D]/10 rounded-xl flex items-center justify-center shrink-0">
                    <Zap className="text-[#FBC02D]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">⚡ Instant Text Input</h3>
                    <p className="text-white/60">Lightning-fast idea and inspiration capture. Zero friction, maximum speed.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-12 h-12 bg-[#FF2D55]/10 rounded-xl flex items-center justify-center shrink-0">
                    <Mic className="text-[#FF2D55]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">🎤 Voice Input Magic</h3>
                    <p className="text-white/60">Just speak your thoughts! We automatically parse your voice and set it as reminders or todos.</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
                <div className="relative bg-gradient-to-br from-[#1D1D1F] to-black rounded-3xl p-6 border border-white/10 shadow-2xl">
                  <div className="aspect-[9/16] bg-white rounded-2xl p-4 flex flex-col justify-between">
                    <div className="h-4 w-24 bg-gray-200 rounded-full mx-auto" />
                    <div className="space-y-3">
                      <div className="h-16 bg-[#FBC02D] rounded-xl flex items-center px-4">
                        <div className="w-5 h-5 rounded border border-black/20 mr-3" />
                        <div className="w-2/3 h-4 bg-black/20 rounded-md" />
                      </div>
                      <div className="h-16 bg-[#007AFF] rounded-xl flex items-center px-4">
                        <div className="w-5 h-5 rounded border-2 border-white flex items-center justify-center mr-3 bg-white/20">
                          <span className="text-white text-xs">✔</span>
                        </div>
                        <div className="w-2/3 h-4 bg-white/30 rounded-md line-through opacity-60" />
                      </div>
                      <div className="h-16 bg-[#34C759] rounded-xl flex items-center px-4">
                        <div className="w-5 h-5 rounded border border-white/30 mr-3" />
                        <div className="w-2/3 h-4 bg-white/20 rounded-md" />
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                        <Mic className="text-white" size={28} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Section 2: Full Features - Notes, Todos, Reminders */}
      <section className="py-24 px-6 relative overflow-hidden bg-black/40 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#34C759]/10 border border-[#34C759]/20 mb-6">
              <CheckSquare className="text-[#34C759]" size={16} />
              <span className="text-[#34C759] text-sm font-semibold">All-in-One</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Notes, Todos & Reminders — all in one
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Powerful organization features designed for creative minds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Palette className="text-[#FF2D55]" size={28} />}
              title="🌈 Custom Colors"
              desc="Set different colors for your notes and todos. Create a visually stunning digital library that matches your style."
            />
            <FeatureCard 
              icon={<Star className="text-[#FBC02D]" size={28} />}
              title="⭐ Star Important Items"
              desc="Mark your most important notes and tasks with stars. Quick access to what matters most."
            />
            <FeatureCard 
              icon={<Pin className="text-[#AF52DE]" size={28} />}
              title="📌 Pin to Top"
              desc="Keep critical information always visible. Pin important notes and tasks to the top of your list."
            />
            <FeatureCard 
              icon={<LayoutGrid className="text-[#34C759]" size={28} />}
              title="🔄 Grid View & List View"
              desc="Switch between grid and list views to match your workflow. Find the perfect way to browse your thoughts."
            />
            <FeatureCard 
              icon={<List className="text-[#FF9500]" size={28} />}
              title="🗂️ Flexible Views"
              desc="Toggle between different layouts effortlessly. Find the view that works best for you."
            />
            <FeatureCard 
              icon={<Tag className="text-[#007AFF]" size={28} />}
              title="🏷️ Tags & Categories"
              desc="Add tags or categories to every note. Organize, filter, and find your thoughts in seconds."
            />
            <FeatureCard 
              icon={<Bell className="text-[#FF2D55]" size={28} />}
              title="🔔 Smart Reminders"
              desc="Set reminders by day, week, month, year, or custom days. Never miss an important deadline."
            />
            <FeatureCard 
              icon={<Clock className="text-[#FBC02D]" size={28} />}
              title="⏰ Flexible Scheduling"
              desc="Daily, weekly, monthly, or custom — your reminders, your way."
            />
            <FeatureCard 
              icon={<LayoutGrid className="text-[#34C759]" size={28} />}
              title="📝 Notes & Journals"
              desc="Use as pure notes or keep a journal. One app for all your writing needs."
            />
          </div>
        </div>
      </section>

      {/* Feature Section 3: Cross-Device Sync & Quick Actions */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/20 mb-6">
                <Monitor className="text-[#007AFF]" size={16} />
                <span className="text-[#007AFF] text-sm font-semibold">Everywhere</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
                Sync across all devices, always
              </h2>
              <p className="text-xl text-white/60 mb-8 leading-relaxed">
                Your thoughts follow you everywhere. From desktop to mobile, everything stays in perfect sync.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-12 h-12 bg-[#34C759]/10 rounded-xl flex items-center justify-center shrink-0">
                    <Smartphone className="text-[#34C759]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">📱 Seamless Sync</h3>
                    <p className="text-white/60">Phone, tablet, desktop — all synced beautifully. Your thoughts, always accessible.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center shrink-0">
                    <Square className="text-[#007AFF]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">📌 Desktop Widget</h3>
                    <p className="text-white/60">Quick add from your desktop widget. Capture inspiration without opening the app.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-12 h-12 bg-[#AF52DE]/10 rounded-xl flex items-center justify-center shrink-0">
                    <Smartphone className="text-[#AF52DE]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">📱 Android Notification Bar</h3>
                    <p className="text-white/60">Persistent notification bar widget for lightning-fast idea capture on Android.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-12 h-12 bg-[#FF2D55]/10 rounded-xl flex items-center justify-center shrink-0">
                    <ChevronRight className="text-[#FF2D55]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">↔️ Edge Swipe</h3>
                    <p className="text-white/60">Swipe from the edge to instantly wake voice input. Capture thoughts in one motion.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-12 h-12 bg-[#FF9500]/10 rounded-xl flex items-center justify-center shrink-0">
                    <Volume1 className="text-[#FF9500]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">🔊 Volume Keys Shortcut</h3>
                    <p className="text-white/60">Long press volume keys to show recent tags and quick reminders.</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <div className="relative h-auto xl:h-[500px] w-full flex flex-col xl:flex-row items-center justify-center gap-8 perspective-[1500px]">
                {/* Desktop Mockup */}
                <motion.div 
                  initial={{ opacity: 0, x: -30, rotateY: 15 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: 5 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 1 }}
                  className="w-[90%] md:w-[400px] max-w-full aspect-[16/10] bg-[#111] rounded-[24px] p-2 border border-[#333] shadow-2xl shrink-0 transform-gpu hover:rotateY-0 hover:z-30 hover:scale-105 transition-all duration-500"
                >
                  <div className="w-full h-full bg-[#FAFAFC] rounded-[18px] overflow-hidden flex flex-col pointer-events-none">
                    <div className="h-8 bg-white border-b border-black/5 flex items-center px-4 gap-2">
                      <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"></div><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div><div className="w-2.5 h-2.5 rounded-full bg-green-400"></div></div>
                    </div>
                    <div className="flex-1 p-4 bg-white overflow-hidden">
                      <div className="w-full space-y-3">
                        <div className="w-full h-10 rounded-full bg-[#F2F2F7] flex items-center px-4"><span className="text-black/30 text-xs">Capture anything...</span></div>
                        <div className="h-12 bg-[#FFCA28] rounded-xl flex items-center px-4">
                          <div className="w-3.5 h-3.5 rounded border border-black/20 mr-3"></div>
                          <div className="w-2/3 h-3 bg-black/20 rounded-md"></div>
                        </div>
                        <div className="h-12 bg-[#007AFF] rounded-xl flex items-center px-4">
                          <div className="w-3.5 h-3.5 rounded border-2 border-black/80 flex items-center justify-center mr-3 bg-white/20 text-white text-[8px]">✔</div>
                          <div className="w-1/3 h-3 bg-black/20 rounded-md line-through opacity-60"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Mobile Mockup */}
                <motion.div 
                  initial={{ opacity: 0, x: 30, rotateY: -15 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: -5 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="w-[220px] aspect-[9/19.5] bg-black rounded-[40px] border-[6px] border-[#333] shadow-2xl p-2 shrink-0 transform-gpu ring-1 ring-white/10 hover:rotateY-0 hover:z-30 hover:scale-105 transition-all duration-500"
                >
                  <div className="w-full h-full bg-white rounded-[30px] overflow-hidden relative pb-16 pt-10 px-3 shadow-inner pointer-events-none">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full"></div>
                    <div className="space-y-2.5">
                      <div className="bg-[#434343] p-3 rounded-xl flex flex-col gap-1.5">
                        <div className="flex justify-between w-full items-center"><div className="w-3.5 h-3.5 rounded border border-white/30"></div><span className="text-white/50 text-[10px]">08:00 AM</span></div>
                        <div className="w-full h-2.5 bg-white/20 rounded mt-1.5"></div>
                      </div>
                      <div className="bg-[#007AFF] p-3 rounded-xl flex flex-col gap-1.5 shadow-lg shadow-blue-500/20">
                        <div className="flex justify-between w-full items-center"><div className="w-3.5 h-3.5 rounded border-2 border-white flex items-center justify-center bg-white/20"><span className="text-white text-[8px]">✔</span></div><div className="flex items-center gap-1 text-white/80 text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full"><Clock size={9} /> Repeat</div></div>
                        <div className="w-3/4 h-2.5 bg-white/30 rounded line-through opacity-60 mt-1.5"></div>
                      </div>
                    </div>
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-40 h-12 bg-black/90 backdrop-blur-xl rounded-full flex items-center justify-around px-3">
                      <div className="w-7 h-7 rounded-full bg-white/20 flex justify-center items-center"><span className="text-white font-bold text-sm">+</span></div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Form / About */}
      <section aria-labelledby="contact-heading" className="py-32 px-6 relative overflow-hidden bg-[#111] border-t border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full" />

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 relative z-10">
          <div>
            <h2 id="contact-heading" className="text-4xl md:text-5xl font-black mb-8">About Thoughtisan</h2>
            <p className="text-white/60 mb-8 leading-relaxed text-lg text-balance">
              Thoughtisan is built for creators who value speed, clarity, and precision. We build software that respects your attention and honors the complexity of your ideas.
            </p>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Company HQ</span>
                <span className="font-medium text-white/80">1440 Innovation Park Dr.</span>
                <span className="font-medium text-white/80">San Francisco, CA 94158</span>
                <span className="font-medium text-white/80">United States</span>
              </div>
              <div className="flex flex-col pt-4 border-t border-white/10">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Direct Contact</span>
                <a href="mailto:hello@thoughtisan.com" className="text-[#007AFF] hover:underline font-medium text-lg">hello@thoughtisan.com</a>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md rounded-[32px] p-8 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <h3 className="text-2xl font-bold mb-8 relative z-10">Send a Message</h3>
            <form className="space-y-5 relative z-10" onSubmit={(e) => { e.preventDefault(); alert('Message sent (demo)!'); }}>
              <div>
                <input type="text" required placeholder="Your full name" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all text-white placeholder-white/30 font-medium" />
              </div>
              <div>
                <input type="email" required placeholder="Email address" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all text-white placeholder-white/30 font-medium" />
              </div>
              <div>
                <textarea required rows={4} placeholder="What's on your mind?" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all text-white placeholder-white/30 font-medium resize-none" />
              </div>
              <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-colors shadow-lg active:scale-95 duration-200 text-lg">
                Send Transmission
              </button>
            </form>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-black text-center relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
             <AppLogo className="w-6 h-6" />
             <span className="font-bold text-white/80">Thoughtisan</span>
          </div>
          <p className="text-white/40 text-sm">
            Designed for speed. Engineered for precision. © {new Date().getFullYear()} All rights reserved.
          </p>
          <div className="flex gap-4">
             <a href="#" className="text-white/40 hover:text-white transition-colors text-sm">Terms</a>
             <a href="#" className="text-white/40 hover:text-white transition-colors text-sm">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 transition-all hover:scale-[1.02] hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:border-white/20 group backdrop-blur-sm">
      <div className="w-16 h-16 bg-black/40 rounded-[20px] flex items-center justify-center shadow-inner mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5 group-hover:border-white/20">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-white/50 leading-relaxed font-light">{desc}</p>
    </div>
  );
}
