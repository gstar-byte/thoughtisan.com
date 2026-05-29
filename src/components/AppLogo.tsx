import React from 'react';

export function AppLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="note-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2C3E50" />
          <stop offset="100%" stop-color="#34495E" />
        </linearGradient>
      </defs>
      {/* 主体便签，圆角矩形 */}
      <path
        d="M20 10 h60 a10 10 0 0 1 10 10 v60 a10 10 0 0 1 -10 10 h-40 l-30 -30 v-50 a10 10 0 0 1 10 -10 z"
        fill="url(#note-bg)"
      />
      {/* 折角小高光 */}
      <path d="M80 10 L70 20 L70 10 Z" fill="#ffffff" opacity="0.2" />
      {/* 闪电图案，代表极速 */}
      <path
        d="M45 35 L55 35 L50 55 L60 55 L40 85 L45 60 L35 60 Z"
        fill="#ffffff"
      />
      {/* AI 点缀 */}
      <circle cx="70" cy="30" r="4" fill="#00BCD4" />
    </svg>
  );
}
