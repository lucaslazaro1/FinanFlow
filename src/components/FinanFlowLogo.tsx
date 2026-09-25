import React from 'react';

interface FinanFlowLogoProps {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

export const FinanFlowLogo: React.FC<FinanFlowLogoProps> = ({ 
  size = 34, 
  className = '',
  withGlow = true
}) => {
  return (
    <div 
      className={`relative flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Subtle ambient glow behind logo */}
      {withGlow && (
        <div 
          className="absolute inset-0 bg-emerald-500/25 rounded-2xl blur-md -z-10 pointer-events-none"
        />
      )}

      {/* Modern Minimalist Fintech Geometric Emblem SVG */}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          {/* Dark obsidian tile gradient */}
          <linearGradient id="tileBg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>

          {/* Precision Emerald to Cyan neon gradient */}
          <linearGradient id="neonFlow" x1="15" y1="20" x2="85" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Accent secondary facet */}
          <linearGradient id="facetAccent" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer squircle base with fine border */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="26"
          fill="url(#tileBg)"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="2"
        />

        {/* Geometric Fintech Node / Stylized Origami Wallet & Infinite Balance Flow */}
        {/* Back card / ledger layer */}
        <path
          d="M 27 34 C 27 30 30 27 34 27 L 70 27 C 73 27 75 29 75 32 L 75 52 C 75 56 72 59 68 59 L 32 59 C 29 59 27 57 27 54 Z"
          fill="rgba(255, 255, 255, 0.06)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="2"
        />

        {/* Primary folding dynamic facet (Financial dynamic delta / stylized "F") */}
        <path
          d="M 24 46 C 24 41 28 37 33 37 L 66 37 C 70 37 73 40 73 44 L 73 66 C 73 71 69 75 64 75 L 31 75 C 27 75 24 72 24 68 Z"
          fill="url(#neonFlow)"
        />

        {/* Diagonal origami slit & balance node connector */}
        <path
          d="M 33 46 L 56 46 C 58 46 60 48 60 50 C 60 52 58 54 56 54 L 38 54 L 48 66 L 38 66 Z"
          fill="#090d16"
          fillOpacity="0.88"
        />

        {/* Subtle geometric financial dot/core node */}
        <circle cx="64" cy="50" r="3.5" fill="#ffffff" />
      </svg>
    </div>
  );
};
