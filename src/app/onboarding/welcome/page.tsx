'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { LivingBackground } from '@/components/living-background';
import { AnimatePresence, m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";


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
    const timer = setTimeout(() => setShowContent(true), 500); 
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
          {showContent && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
               className="w-full max-w-md space-y-8 flex flex-col items-center"
            >
                <h1 className="text-4xl md:text-5xl font-headline font-bold text-center text-gradient mb-4">
                    Welcome, {name || 'to Your Wellness Journey'}
                </h1>
              
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
        </AnimatePresence>
      </div>
    </div>
  );
}
