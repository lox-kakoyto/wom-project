import React from 'react';

export const Logo: React.FC<{ className?: string, showText?: boolean }> = ({ className = "h-10", showText = true }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Abstract Spartan/Glitch Icon */}
      <svg viewBox="0 0 100 100" className="h-full w-auto fill-none stroke-current text-wom-accent" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20 L40 80 L50 60 L60 80 L80 20" className="text-wom-primary stroke-current" />
        <path d="M50 20 V60" className="text-white stroke-current" />
        <path d="M10 30 H30" className="opacity-50" />
        <path d="M70 30 H90" className="opacity-50" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display font-black text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-wom-primary via-wom-accent to-wom-glow">
            WOM
          </span>
          <span className="font-body text-[10px] tracking-widest text-wom-text opacity-70">
            WORLD OF MADNESS
          </span>
        </div>
      )}
    </div>
  );
};