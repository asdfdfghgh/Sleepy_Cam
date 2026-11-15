// Adapted from @magicuidesign/magicui (MIT License) — 21st.dev Particles
import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  color?: string;
  vx?: number;
  vy?: number;
}

interface Circle {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const intVal = parseInt(clean, 16);
  return [(intVal >> 16) & 255, (intVal >> 8) & 255, intVal & 255];
}

export const Particles: React.FC<ParticlesProps> = ({
  className = '',
  quantity = 38,
  staticity = 60,
  ease = 50,
  size = 0.8,
  color = '#00ffc6',
  vx = 0,
  vy = -0.05
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const circlesRef = useRef<Circle[]>([]);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rgb = hexToRgb(color);
    let rafId: number | null = null;

    const spawnCircle = (): Circle => ({
      x: Math.random() * sizeRef.current.w,
      y: Math.random() * sizeRef.current.h,
      translateX: 0,
      translateY: 0,
      size: Math.random() * 1.4 + size,
      alpha: 0,
      targetAlpha: Number((Math.random() * 0.42 + 0.08).toFixed(2)),
      dx: (Math.random() - 0.5) * 0.14,
      dy: (Math.random() - 0.5) * 0.14,
      magnetism: 0.2 + Math.random() * 2.5
    });

    const resize = () => {
      sizeRef.current.w = container.offsetWidth;
      sizeRef.current.h = container.offsetHeight;
      canvas.width = sizeRef.current.w * dpr;
      canvas.height = sizeRef.current.h * dpr;
      canvas.style.width = `${sizeRef.current.w}px`;
      canvas.style.height = `${sizeRef.current.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      circlesRef.current = [];
      for (let i = 0; i < quantity; i++) {
        circlesRef.current.push(spawnCircle());
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - sizeRef.current.w / 2;
      const y = e.clientY - rect.top - sizeRef.current.h / 2;
      if (Math.abs(x) < sizeRef.current.w / 2 && Math.abs(y) < sizeRef.current.h / 2) {
        mouseRef.current = { x, y };
      }
    };

    const tick = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < circlesRef.current.length; i++) {
        const c = circlesRef.current[i];
        if (c.alpha < c.targetAlpha) {
          c.alpha = Math.min(c.targetAlpha, c.alpha + 0.01);
        }

        c.x += c.dx + vx;
        c.y += c.dy + vy;
        c.translateX += (mouseRef.current.x / (staticity / c.magnetism) - c.translateX) / ease;
        c.translateY += (mouseRef.current.y / (staticity / c.magnetism) - c.translateY) / ease;

        if (c.x < -10 || c.x > w + 10 || c.y < -10 || c.y > h + 10) {
          circlesRef.current[i] = spawnCircle();
          continue;
        }

        ctx.beginPath();
        ctx.arc(c.x + c.translateX, c.y + c.translateY, c.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${c.alpha})`;
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    resize();
    rafId = window.requestAnimationFrame(tick);

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [color, ease, quantity, size, staticity, vx, vy]);

  return (
    <div ref={containerRef} aria-hidden="true" className={cn('pointer-events-none', className)}>
      <canvas ref={canvasRef} className="size-full block" />
    </div>
  );
};
