import React from 'react';

export function AppLogo({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 便签纸底色：极致纯净的雅致渐变白 */}
        <linearGradient id="paper-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F9FAFB" />
        </linearGradient>
        
        {/* 卷角背面的立体渐变：模拟纸张翻折的阴影与高光 */}
        <linearGradient id="curl-bg" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C8CCD4" />
          <stop offset="40%" stopColor="#E5E7EB" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        {/* 三个胶囊的高级配色 */}
        <linearGradient id="pill-pink" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F43F5E" />
        </linearGradient>
        <linearGradient id="pill-blue" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="pill-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>

        {/* 整体纸张悬浮阴影 */}
        <filter id="paper-shadow" x="-20%" y="-20%" width="145%" height="145%">
          <feDropShadow dx="0" dy="5" stdDeviation="5.5" floodColor="#000000" floodOpacity="0.13" />
        </filter>

        {/* 掀起弯折角的阴影：创造凌空飞起的感觉 */}
        <filter id="curl-shadow" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="-2" dy="-2" stdDeviation="3" floodColor="#000000" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* 整体旋转：西北-东南走向 */}
      <g transform="rotate(-26, 50, 50)">
        
        {/* 1. 便签纸主体（右下角折叠切边） */}
        <path 
          d="M18 30 C18 23.3726 23.3726 18 30 18 H70 C76.6274 18 82 23.3726 82 30 V60 L60 82 H30 C23.3726 82 18 76.6274 18 70 Z" 
          fill="url(#paper-bg)" 
          filter="url(#paper-shadow)"
        />

        {/* 2. 3行精美小胶囊清单 */}
        
        {/* 第一行：洋红胶囊 (未完成方块 + 右侧金黄色小星星 ⭐️) */}
        <rect x="25" y="28" width="6" height="6" rx="1.5" stroke="url(#pill-pink)" strokeWidth="1.2" fill="none" />
        <rect x="35" y="28" width="28" height="6" rx="3" fill="url(#pill-pink)" />
        {/* 饱满完美的五角星 ⭐️ */}
        <path 
          d="M75.5 27 L77.1 30.2 L80.6 30.7 L78.0 33.1 L78.6 36.6 L75.5 34.9 L72.4 36.6 L73.0 33.1 L70.4 30.7 L73.9 30.2 Z" 
          fill="url(#pill-yellow)" 
        />

        {/* 第二行：极客蓝胶囊 (已完成打勾复选框 + 右侧超圆润小铃铛 🔔) */}
        <rect x="25" y="42" width="6" height="6" rx="1.5" fill="url(#pill-blue)" />
        <path d="M26.5 45 L27.8 46.3 L30 44" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="35" y="42" width="31" height="6" rx="3" fill="url(#pill-blue)" />
        {/* 超饱满可爱扁平圆润小铃铛 🔔 */}
        <path 
          d="M75.5 38.5 C74.2 38.5 73.2 39.8 73.2 41.2 C73.2 42.2 72.2 44.2 71.5 44.8 C71 45.3 71.5 46.2 72.8 46.2 H78.2 C79.5 46.2 80 45.3 79.5 44.8 C78.8 44.2 77.8 42.2 77.8 41.2 C77.8 39.8 76.8 38.5 75.5 38.5 Z" 
          fill="url(#pill-blue)" 
        />
        <circle cx="75.5" cy="47.2" r="1.1" fill="url(#pill-blue)" />

        {/* 第三行：明黄胶囊 (未完成方块) */}
        <rect x="25" y="56" width="6" height="6" rx="1.5" stroke="url(#pill-yellow)" strokeWidth="1.2" fill="none" />
        <rect x="35" y="56" width="20" height="6" rx="3" fill="url(#pill-yellow)" />

        {/* 3. 掀起一角的微弱底影线 */}
        <path d="M60 82 C60 68 68 60 82 60" stroke="#000000" strokeOpacity={0.08} strokeWidth="3" fill="none" />

        {/* 4. 掀起弯折的角本身 */}
        <path 
          d="M60 82 C60 71 71 60 82 60 C71 71 71 82 60 82 Z" 
          fill="url(#curl-bg)" 
          filter="url(#curl-shadow)"
        />
        <path d="M60 82 L82 60" stroke="#D1D5DB" strokeOpacity={0.4} strokeWidth="0.5" />
        
      </g>
    </svg>
  );
}
