
import React from 'react';
import { Logo } from './Logo';
import { motion } from 'framer-motion';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-wom-bg flex flex-col items-center justify-center">
      <div className="relative">
        {/* Pulsing Glow Behind */}
        <div className="absolute inset-0 bg-wom-primary/20 blur-3xl rounded-full animate-pulse-slow"></div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <Logo className="h-20 w-auto" showText={false} />
          
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl font-display font-bold text-white tracking-widest animate-pulse">
              LOADING
            </h2>
            <div className="h-1 w-32 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-wom-primary via-wom-accent to-wom-primary w-full animate-[shimmer_1.5s_infinite]"></div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};