'use client';
import React from 'react';
import { m } from 'framer-motion';

interface HormoneOrbProps {
  color: string;
  size: number;
  initialX: number;
  initialY: number;
}

export const HormoneOrb: React.FC<HormoneOrbProps> = ({ color, size, initialX, initialY }) => {
  const animationDuration = Math.random() * 20 + 25; // 25-45 seconds

  return (
    <m.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size * 0.8}px ${color}, 0 0 ${size * 1.5}px ${color} / 0.5`,
        opacity: 0.5,
      }}
      initial={{ x: initialX, y: initialY }}
      animate={{
        x: [initialX, Math.random() * window.innerWidth, initialX],
        y: [initialY, Math.random() * window.innerHeight, initialY],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: animationDuration,
        ease: 'easeInOut',
        repeat: Infinity,
      }}
    />
  );
};
