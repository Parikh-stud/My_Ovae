
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { m } from 'framer-motion';
import React from "react";

const LogoParticles = ({ count = 100 }: { count?: number }) => {
  const particles = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * 360;
    const radius = Math.random() * 80 + 20;
    const x = Math.cos(angle * (Math.PI / 180)) * radius;
    const y = Math.sin(angle * (Math.PI / 180)) * radius;
    const colors = ["#8B5CF6", "#EC4899", "#F97316"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return (
        <m.div
            key={i}
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ 
                x: x, 
                y: y,
                scale: 0,
                opacity: 0
            }}
            transition={{
                duration: 2,
                ease: "easeOut",
                delay: Math.random() * 0.2,
            }}
            style={{
                position: 'absolute',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: color,
            }}
      />
    );
  });
  return <div className="absolute top-1/2 left-1/2">{particles}</div>;
};


export const Logo = ({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "sm";
}) => {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-2 font-headline font-black tracking-tighter text-gradient",
          size === "default" && "text-4xl",
          size === "sm" && "text-2xl"
        )}
      >
        <Sparkles
          className={cn(
            "text-primary",
            size === "default" && "size-7",
            size === "sm" && "size-5"
          )}
        />
        MyOvae
      </div>
    </div>
  );
};
