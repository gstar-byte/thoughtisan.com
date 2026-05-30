import React from 'react';

export function AppLogo({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 整体旋转：经典高雅倾斜 26 度 */}
      <g transform="rotate(-26, 50, 50)">
        
        {/* 1. 矢量扁平硬投影：偏置 2px 渲染 (Flat Vector Shadow) */}
        <path 
          d="M18 32 C18 25.3726 23.3726 20 30 20 H70 C76.6274 20 82 25.3726 82 32 V62 L60 84 H30 C23.3726 84 18 78.6274 18 72 Z" 
          fill="#000000" 
          fillOpacity="0.08"
        />

        {/* 2. 便签纸主体：纯 Canary Yellow 经典浅黄色 (Classic Canary Yellow Solid) */}
        <path 
          d="M18 30 C18 23.3726 23.3726 18 30 18 H70 C76.6274 18 82 23.3726 82 30 V60 L60 82 H30 C23.3726 82 18 76.6274 18 70 Z" 
          fill="#FEF08A" 
        />

        {/* 3. 3行精美小胶囊清单 (Solid Colors, No IDs) */}
        
        {/* 第一行：洋红胶囊 (未完成方块 + 右侧金黄色小五角星 ⭐️) */}
        <rect x="25" y="28" width="6" height="6" rx="1.5" stroke="#EC4899" strokeWidth="1.2" fill="none" />
        <rect x="35" y="28" width="28" height="6" rx="3" fill="#EC4899" />
        {/* 饱满五角星 */}
        <path 
          d="M75.5 27 L77.1 30.2 L80.6 30.7 L78.0 33.1 L78.6 36.6 L75.5 34.9 L72.4 36.6 L73.0 33.1 L70.4 30.7 L73.9 30.2 Z" 
          fill="#EAB308" 
        />

        {/* 第二行：极客蓝胶囊 (已完成打勾复选框 + 右侧超圆润小铃铛 🔔) */}
        <rect x="25" y="42" width="6" height="6" rx="1.5" fill="#007AFF" />
        <path d="M26.5 45 L27.8 46.3 L30 44" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="35" y="42" width="31" height="6" rx="3" fill="#007AFF" />
        {/* 饱满可爱的扁平纯色小铃铛 */}
        <path 
          d="M75.5 38.5 C74.2 38.5 73.2 39.8 73.2 41.2 C73.2 42.2 72.2 44.2 71.5 44.8 C71 45.3 71.5 46.2 72.8 46.2 H78.2 C79.5 46.2 80 45.3 79.5 44.8 C78.8 44.2 77.8 42.2 77.8 41.2 C77.8 39.8 76.8 38.5 75.5 38.5 Z" 
          fill="#007AFF" 
        />
        <circle cx="75.5" cy="47.2" r="1.1" fill="#007AFF" />

        {/* 第三行：明黄胶囊 (未完成方块) */}
        <rect x="25" y="56" width="6" height="6" rx="1.5" stroke="#F97316" strokeWidth="1.2" fill="none" />
        <rect x="35" y="56" width="20" height="6" rx="3" fill="#F97316" />

        {/* 4. 掀起一角的微弱矢量阴影线 */}
        <path d="M60 82 C60 68 68 60 82 60" stroke="#000000" strokeOpacity="0.08" strokeWidth="3" fill="none" />

        {/* 5. 掀起弯折的角本身：纯金黄色，创造凌空飞角的折叠背面立面 */}
        <path 
          d="M60 82 C60 71 71 60 82 60 C71 71 71 82 60 82 Z" 
          fill="#EAB308" 
        />
        <path d="M60 82 L82 60" stroke="#EAB308" strokeOpacity="0.3" strokeWidth="0.5" />
        
      </g>
    </svg>
  );
}
