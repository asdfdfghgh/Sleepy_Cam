// Adapted from @codedthemes/uiable SpotlightCard + MagicUI BorderBeam (MIT License)
import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { BorderBeam } from './BorderBeam';

interface SpotlightSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
  beam?: boolean;
  beamColorFrom?: string;
  beamColorTo?: string;
}

export const SpotlightSurface: React.FC<SpotlightSurfaceProps> = ({
  children,
  className,
  spotlightColor = 'rgba(0, 255, 198, 0.14)',
  beam = false,
  beamColorFrom = '#00ffc6',
  beamColorTo = '#111317',
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-black/10 bg-white/90 backdrop-blur-xl shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-white/12 dark:bg-[#14161b]/90 dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)] transition-colors',
        className
      )}
      {...rest}
    >
      {beam && <BorderBeam size={90} duration={7} colorFrom={beamColorFrom} colorTo={beamColorTo} />}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(380px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 74%)`
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
