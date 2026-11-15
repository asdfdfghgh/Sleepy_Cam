import React from 'react';
import { motion } from 'motion/react';
import { GlowEffect } from './GlowEffect';

export const HolographicEyeHud: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Soft ambient cyan-turquoise glow */}
      <div className="absolute inset-8 rounded-full opacity-45 dark:opacity-55">
        <GlowEffect
          colors={['#22D3EE', '#14B8A6', '#34D399']}
          mode="pulse"
          blur="stronger"
          duration={5}
        />
      </div>

      <svg
        viewBox="0 0 320 320"
        className="relative z-10 w-64 h-64 sm:w-76 sm:h-76 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="hudCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#14B8A6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#050811" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hudIrisStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="50%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>

        <circle cx="160" cy="160" r="142" fill="url(#hudCoreGlow)" />

        {/* Outer dashed telemetry ring rotating smoothly */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
          style={{ originX: '160px', originY: '160px' }}
        >
          <circle
            cx="160"
            cy="160"
            r="134"
            fill="none"
            stroke="#22D3EE"
            strokeOpacity="0.24"
            strokeWidth="1"
            strokeDasharray="6 10"
          />
          <path
            d="M 160 18 L 160 28 M 160 292 L 160 302 M 18 160 L 28 160 M 292 160 L 302 160"
            stroke="#22D3EE"
            strokeOpacity="0.65"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </motion.g>

        {/* Counter-rotating biometric arc segments */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
          style={{ originX: '160px', originY: '160px' }}
        >
          <circle
            cx="160"
            cy="160"
            r="112"
            fill="none"
            stroke="url(#hudIrisStroke)"
            strokeOpacity="0.45"
            strokeWidth="1.5"
            strokeDasharray="48 26 16 26"
          />
        </motion.g>

        {/* Stylized Eye Aperture Contour */}
        <path
          d="M 46 160 C 84 102, 122 86, 160 86 C 198 86, 236 102, 274 160 C 236 218, 198 234, 160 234 C 122 234, 84 218, 46 160 Z"
          fill="rgba(34, 211, 238, 0.04)"
          stroke="url(#hudIrisStroke)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Iris Ring & Reactive Pupil */}
        <circle
          cx="160"
          cy="160"
          r="52"
          fill="rgba(20, 184, 166, 0.08)"
          stroke="#22D3EE"
          strokeOpacity="0.8"
          strokeWidth="1.75"
        />
        <motion.circle
          cx="160"
          cy="160"
          r="34"
          fill="none"
          stroke="#34D399"
          strokeOpacity="0.7"
          strokeWidth="1.25"
          strokeDasharray="4 6"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}
          style={{ originX: '160px', originY: '160px' }}
        />

        <motion.circle
          cx="160"
          cy="160"
          r="15"
          fill="#22D3EE"
          animate={{ scale: [1, 1.18, 1], opacity: [0.82, 1, 0.82] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
          style={{ originX: '160px', originY: '160px' }}
        />
        <circle cx="154" cy="154" r="4" fill="#FFFFFF" opacity="0.85" />

        {/* Precision Optical Focus Brackets */}
        <path
          d="M 76 112 V 92 H 96 M 244 112 V 92 H 224 M 76 208 V 228 H 96 M 244 208 V 228 H 224"
          fill="none"
          stroke="#22D3EE"
          strokeOpacity="0.6"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
