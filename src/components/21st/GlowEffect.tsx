// Adapted from @ibelick/motion-primitives (MIT License) — 21st.dev GlowEffect
import React from 'react';
import { motion, type Transition } from 'motion/react';
import { cn } from '../../lib/utils';

export type GlowEffectProps = {
  className?: string;
  style?: React.CSSProperties;
  colors?: string[];
  mode?: 'rotate' | 'pulse' | 'breathe' | 'colorShift' | 'static';
  blur?: number | 'softest' | 'soft' | 'medium' | 'strong' | 'stronger' | 'none';
  transition?: Transition;
  scale?: number;
  duration?: number;
};

export const GlowEffect: React.FC<GlowEffectProps> = ({
  className,
  style,
  colors = ['#00ffc6', '#00d9aa', '#00e5b2', '#34d399'],
  mode = 'breathe',
  blur = 'strong',
  transition,
  scale = 1,
  duration = 6
}) => {
  const baseTransition: Transition = {
    repeat: Infinity,
    duration,
    ease: 'linear'
  };

  const animations = {
    rotate: {
      background: [
        `conic-gradient(from 0deg at 50% 50%, ${colors.join(', ')})`,
        `conic-gradient(from 360deg at 50% 50%, ${colors.join(', ')})`
      ],
      transition: transition ?? baseTransition
    },
    pulse: {
      background: colors.map(
        (color) => `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 72%)`
      ),
      scale: [1 * scale, 1.08 * scale, 1 * scale],
      opacity: [0.35, 0.65, 0.35],
      transition: transition ?? { ...baseTransition, repeatType: 'mirror' as const }
    },
    breathe: {
      background: colors.map(
        (color) => `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 72%)`
      ),
      scale: [1 * scale, 1.05 * scale, 1 * scale],
      transition: transition ?? { ...baseTransition, repeatType: 'mirror' as const }
    },
    colorShift: {
      background: colors.map((color, index) => {
        const nextColor = colors[(index + 1) % colors.length];
        return `linear-gradient(to right, ${color}, ${nextColor})`;
      }),
      transition: transition ?? { ...baseTransition, repeatType: 'mirror' as const }
    },
    static: {
      background: `radial-gradient(circle at 50% 50%, ${colors[0]} 0%, transparent 75%)`
    }
  };

  const getBlurClass = () => {
    if (typeof blur === 'number') return '';
    const presets = {
      softest: 'blur-xs',
      soft: 'blur-sm',
      medium: 'blur-md',
      strong: 'blur-xl',
      stronger: 'blur-2xl',
      none: 'blur-none'
    };
    return presets[blur];
  };

  return (
    <motion.div
      aria-hidden="true"
      style={
        {
          ...style,
          filter: typeof blur === 'number' ? `blur(${blur}px)` : undefined,
          willChange: 'transform, opacity'
        } as React.CSSProperties
      }
      animate={animations[mode]}
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full transform-gpu',
        getBlurClass(),
        className
      )}
    />
  );
};
