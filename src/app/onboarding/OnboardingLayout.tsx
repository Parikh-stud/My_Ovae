'use client';

import React from 'react';
import { m } from 'framer-motion';
import { LivingBackground } from '@/components/living-background';
import { Progress } from '@/components/ui/progress';

interface OnboardingLayoutProps {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}

export const OnboardingLayout = ({ step, title, description, children }: OnboardingLayoutProps) => {
  const progressValue = (step / 7) * 100;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
      <LivingBackground />
      <div className="z-10 flex flex-col items-center justify-center text-center w-full max-w-4xl space-y-6">
        <div className="w-full px-4 max-w-2xl">
          <h3 className="text-sm font-body text-muted-foreground mb-2">Step {step} of 7</h3>
          <Progress value={progressValue} className="h-2 bg-muted/50" />
        </div>
        
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-center text-gradient">{title}</h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </m.div>
        
        {children}
      </div>
    </div>
  );
};
