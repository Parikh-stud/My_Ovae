
'use client';
import React, { useMemo, useEffect, useState } from 'react';
import { HormoneOrb } from './hormone-orb';

const CellularPattern = () => (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 animate-cellular-pulse">
        <defs>
            <pattern id="pattern-cellular" patternUnits="userSpaceOnUse" width="100" height="100" >
                <path d="M 50 0 L 100 25 L 100 75 L 50 100 L 0 75 L 0 25 Z" fill="hsl(var(--primary) / 0.02)" stroke="hsl(var(--primary) / 0.1)" strokeWidth="1" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pattern-cellular)" />
    </svg>
);

export const LivingBackground = () => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const orbs = useMemo(() => {
        if (!isClient) return [];
        const orbData = [
            ...Array(7).fill(0).map(() => ({ type: 'estrogen', color: '#EC4899', size: Math.random() * 20 + 30 })), // Pink
            ...Array(6).fill(0).map(() => ({ type: 'progesterone', color: '#8B5CF6', size: Math.random() * 15 + 25 })), // Purple
            ...Array(4).fill(0).map(() => ({ type: 'testosterone', color: '#F97316', size: Math.random() * 15 + 20 })), // Orange
        ];
        return orbData.map(orb => ({
            ...orb,
            initialX: Math.random() * window.innerWidth,
            initialY: Math.random() * window.innerHeight,
        }));
  }, [isClient]);

  if (!isClient) {
      return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      <CellularPattern />
      {orbs.map((orb, i) => (
        <HormoneOrb key={i} color={orb.color} size={orb.size} initialX={orb.initialX} initialY={orb.initialY} />
      ))}
    </div>
  );
};
