
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';

export const HormoneOrb = ({ color, size, initialX, initialY }: { color: string, size: number, initialX: number, initialY: number }) => {
  const constraintsRef = useRef(null);
  const [animateX, setAnimateX] = useState<number[]>([]);
  const [animateY, setAnimateY] = useState<number[]>([]);

  useEffect(() => {
    // This code now runs only on the client, after the component has mounted
    if (typeof window !== 'undefined') {
        setAnimateX([initialX, Math.random() * (window.innerWidth - size), Math.random() * (window.innerWidth - size), initialX]);
        setAnimateY([initialY, Math.random() * (window.innerHeight - size), Math.random() * (window.innerHeight - size), initialY]);
    }
  }, [initialX, initialY, size]);


  return (
      <m.div
        ref={constraintsRef}
        className="absolute"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <m.div
            className="absolute rounded-full"
            style={{
                backgroundColor: color,
                width: size,
                height: size,
                filter: 'blur(10px)',
                opacity: 0.6,
            }}
            initial={{ x: initialX, y: initialY }}
            drag
            dragConstraints={constraintsRef}
            dragElastic={0.1}
            animate={{
                x: animateX,
                y: animateY,
            }}
            transition={{
                duration: Math.random() * 20 + 20,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut"
            }}
        />
    </m.div>
  );
};
