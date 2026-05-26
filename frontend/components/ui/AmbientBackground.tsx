'use client';

import { motion } from 'framer-motion';

/**
 * AmbientBackground renders floating, hardware-accelerated, slow-pulsing
 * blurred gradient circles that establish the Obsidian Sanctuary environment.
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none bg-[#090D16]">
      {/* Warm Burnished Gold glow (Top-Left quadrant focus) */}
      <motion.div
        animate={{
          x: [0, 50, -20, 0],
          y: [0, -30, 40, 0],
          scale: [1, 1.12, 0.95, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[-15%] left-[-15%] h-[650px] w-[650px] rounded-full bg-[#D4AF37]/[0.035] blur-[140px]"
      />

      {/* Emerald Pulse glow (Bottom-Right quadrant focus) */}
      <motion.div
        animate={{
          x: [0, -60, 30, 0],
          y: [0, 40, -30, 0],
          scale: [1, 0.92, 1.08, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-[-15%] right-[-15%] h-[750px] w-[750px] rounded-full bg-[#10B981]/[0.018] blur-[150px]"
      />

      {/* Centered subtle gold accent glow */}
      <motion.div
        animate={{
          x: [0, 30, -30, 0],
          y: [0, 20, -20, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[30%] left-[20%] h-[450px] w-[450px] rounded-full bg-[#D4AF37]/[0.012] blur-[120px]"
      />
    </div>
  );
}
