
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { LivingBackground } from '@/components/living-background';
import { AnimatePresence, m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";


const AnimatedText = ({ text, stagger = 50, onComplete }: { text: string, stagger?: number, onComplete?: () => void }) => {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed < text.length) {
      const timer = setTimeout(() => setRevealed(revealed + 1), stagger);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [revealed, text, stagger, onComplete]);

  const chars = text.split('').map((char, i) => (
    <m.span
      key={i}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * stagger / 1000, duration: 0.3 }}
      className="inline-block"
    >
      {char === ' ' ? ' ' : char}
    </m.span>
  ));

  return (
    <h1 className="text-4xl md:text-5xl font-headline font-bold text-center text-gradient mb-12">
      {chars}
    </h1>
  );
};

const NameInput = ({ initialName = '', onNameChange }: { initialName?: string, onNameChange: (name: string) => void }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    onNameChange(newName);
  };
  
  const placeholderChars = "What should we call you?".split('').map((char, i) => (
     <m.span
      key={i}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: isFocused || name ? 0 : 0.5 }}
      transition={{ delay: i * 0.03 }}
      className="inline-block"
    >
      {char}
    </m.span>
  ));

  return (
    <div className="relative w-full max-w-md">
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary via-secondary to-orange-400 rounded-lg blur-sm transition-all duration-300 ${isFocused ? 'opacity-75' : 'opacity-20'}`}></div>
      <div className="relative">
         <Input
            type="text"
            value={name}
            onChange={handleNameChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full text-center text-xl bg-background/80 backdrop-blur-sm border-2 border-border/50 h-16 rounded-lg transition-all duration-300 focus:scale-105 focus:border-primary/50 placeholder-transparent"
            />
        {!name && !isFocused && <div className="absolute inset-0 flex items-center justify-center text-xl pointer-events-none text-muted-foreground">{placeholderChars}</div>}
      </div>
    </div>
  );
};


export default function WelcomePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [name, setName] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (user) {
      setName(user.displayName || '');
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(true), 500); 
    return () => clearTimeout(timer);
  }, []);


  const handleContinue = async () => {
    if (user && firestore) {
        const userRef = doc(firestore, 'users', user.uid);
        const publicUserRef = doc(firestore, 'publicUserProfiles', user.uid);

        const userData = {
            displayName: name,
            'onboarding.currentStep': 'journey-status',
        };
        const publicUserData = { displayName: name, id: user.uid };
        
        try {
            // Use set with merge to create or update both documents
            await Promise.all([
                setDocumentNonBlocking(userRef, userData, { merge: true }),
                setDocumentNonBlocking(publicUserRef, publicUserData, { merge: true })
            ]);
            router.push('/onboarding/journey-status');
        } catch(e) {
             toast({
                variant: "destructive",
                title: "Onboarding Error",
                description: "Could not save your profile. Please try again.",
            });
        }
    } else {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not identify user. Please try logging in again.",
        });
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
        <LivingBackground />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
      <LivingBackground />
      <div className="z-10 flex flex-col items-center justify-center text-center w-full">
        <AnimatePresence>
          {showWelcome && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              onAnimationComplete={() => setShowContent(true)}
            >
              <AnimatedText 
                text={`Welcome, ${name || 'to Your Wellness Journey'}`} 
                stagger={30}
              />
            </m.div>
          )}
        </AnimatePresence>
        
        {showContent && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="w-full max-w-md space-y-8 flex flex-col items-center"
          >
            <NameInput initialName={name} onNameChange={setName} />

            <div className="flex items-center justify-center space-x-4">
              <Button 
                size="lg" 
                className="h-16 continue-button-pulse text-lg" 
                disabled={!name.trim()}
                onClick={handleContinue}
              >
                Continue <ArrowRight className="ml-2" />
              </Button>
            </div>
          </m.div>
        )}
      </div>
    </div>
  );
}
