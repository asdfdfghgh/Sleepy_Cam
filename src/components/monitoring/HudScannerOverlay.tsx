import React from 'react';

interface HudScannerOverlayProps {
  active?: boolean;
  variant?: 'setup' | 'scanning' | 'monitoring';
}

/**
 * Purely visual futuristic HUD targeting frame & scanline sweep.
 * Uses pointer-events-none in an isolated overlay sibling layer so webcam video
 * frames and MediaPipe landmark coordinate math remain untouched.
 */
export const HudScannerOverlay: React.FC<HudScannerOverlayProps> = ({
  active = false,
  variant = 'monitoring'
}) => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Sleek Visor Corner Brackets (#00ffc6 Electric Mint) */}
      <div className="absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 border-[#00ffc6]/75 rounded-tl-sm" />
      <div className="absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 border-[#00ffc6]/75 rounded-tr-sm" />
      <div className="absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 border-[#00ffc6]/75 rounded-bl-sm" />
      <div className="absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 border-[#00ffc6]/75 rounded-br-sm" />

      {/* Center Reticle Framing Box during Camera Setup / Scanning */}
      {(variant === 'setup' || variant === 'scanning') && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[46%] h-[72%] rounded-2xl border border-[#00ffc6]/25 shadow-[inset_0_0_24px_rgba(0,255,198,0.08)]" />
        </div>
      )}

      {/* Subtle Laser Scan Line while Active */}
      {active && (
        <div className="animate-hud-scan absolute inset-x-0 top-0 h-16 bg-linear-to-b from-transparent via-[#00ffc6]/16 to-transparent border-b border-[#00ffc6]/50" />
      )}
    </div>
  );
};
