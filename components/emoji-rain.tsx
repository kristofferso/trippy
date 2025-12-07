'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type EmojiDrop = {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  size: number;
  duration: number;
};

export function EmojiRain({ emoji }: { emoji: string | null }) {
  const [drops, setDrops] = useState<EmojiDrop[]>([]);

  useEffect(() => {
    if (!emoji) return;

    // Create a burst of emojis
    const count = 30;
    const newDrops: EmojiDrop[] = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      emoji,
      x: Math.random() * 100, // random percent
      delay: Math.random() * 0.5,
      size: 1.5 + Math.random() * 2, // 1.5rem to 3.5rem
      duration: 1 + Math.random(),
    }));

    setDrops((prev) => [...prev, ...newDrops]);

    // Cleanup after animation
    const timeout = setTimeout(() => {
      setDrops((prev) => prev.filter((d) => !newDrops.includes(d)));
    }, 2500);

    return () => clearTimeout(timeout);
  }, [emoji]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {drops.map((drop) => (
          <motion.div
            key={drop.id}
            initial={{ y: -100, opacity: 1, x: `${drop.x}vw` }}
            animate={{ y: '110vh', rotate: Math.random() * 360 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: drop.duration,
              delay: drop.delay,
              ease: 'linear',
            }}
            style={{ fontSize: `${drop.size}rem` }}
            className="absolute top-0"
          >
            {drop.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

