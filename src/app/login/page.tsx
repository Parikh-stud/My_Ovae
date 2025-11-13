
'use client';

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import React, { useEffect, useState } from "react";
import { LivingBackground } from "@/components/living-background";
import { m } from 'framer-motion';
import { useAuth, useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { 
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore }from "@/firebase";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";

const GoogleIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  useEffect(() => {
    const handleSuccessfulLogin = async (firebaseUser: FirebaseUser) => {
        if (!firestore) return;
        const userRef = doc(firestore, 'users', firebaseUser.uid);
        
        try {
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                updateDocumentNonBlocking(userRef, { lastLogin: serverTimestamp() });
                
                if (userData?.themePreference) {
                  setTheme(userData.themePreference);
                }
                
                if (userData?.onboardingCompleted) {
                    router.push('/dashboard');
                } else {
                    router.push('/onboarding/welcome');
                }
            } else {
                const newUserDoc = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName || '',
                    photoURL: firebaseUser.photoURL,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    onboardingCompleted: false,
                    themePreference: 'dark'
                };
                await setDocumentNonBlocking(userRef, newUserDoc);
                const publicUserRef = doc(firestore, 'publicUserProfiles', firebaseUser.uid);
                await setDocumentNonBlocking(publicUserRef, {
                    id: firebaseUser.uid,
                    displayName: firebaseUser.displayName || 'Anonymous',
                    photoURL: firebaseUser.photoURL,
                });
                setTheme('dark');
                router.push('/onboarding/welcome');
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Login Error",
                description: "Could not process your user profile. Please try again.",
            });
            setIsAuthLoading(false);
        }
      };

    if (!isUserLoading && user) {
        handleSuccessfulLogin(user);
    }
  }, [user, isUserLoading, firestore, router, setTheme, toast]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsAuthLoading(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: error.message || "An error occurred. Please try again.",
      });
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: error.message || "Could not sign in with Google. Please try again.",
        });
        setIsAuthLoading(false);
    }
  };

  if (isUserLoading || user) {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
            <LivingBackground />
            <div className="z-10 flex flex-col items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <p className="text-muted-foreground">Loading Your Wellness Journey...</p>
            </div>
        </div>
    );
  }

  return (
    <main className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
      <LivingBackground />

      <div className="w-full max-w-sm z-10">
        <m.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "backOut" }}
          className="glass-card-auth rounded-3xl p-8 text-center flex flex-col items-center"
        >
          <Logo className="mb-2" />
          
          <p className="font-accent text-lg text-muted-foreground italic mb-6">
            Your Personalized PCOS Wellness Companion
          </p>

          <div className="w-full space-y-3 mb-6">
            <Button variant="outline" className="w-full animate-biopulse-resting" onClick={handleGoogleSignIn} disabled={isAuthLoading}>
              <GoogleIcon />
              Continue with Google
            </Button>
            <Button variant="outline" className="w-full animate-biopulse-resting cursor-not-allowed" disabled={true}>
              <svg className="size-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M19.33 13.06c-.32.08-.72.2-.95.18c-.23-.02-.63-.17-.93-.17c-1.33 0-2.23.86-3.13.86c-.88 0-1.6-.81-2.93-.81c-1.35 0-2.43.86-3.3.86c-.9 0-1.7-.83-2.98-.83c-.75 0-1.38.33-1.93.73c-1.2.93-1.6 2.5-1.05 4.58c.53 2.1 1.63 3.88 2.93 3.88c.85 0 1.3-.53 2.45-.53c1.13 0 1.5.53 2.5.53c1.23 0 1.83-.9 3.03-.9c1.18 0 1.65.9 2.95.9c1.23 0 1.93-.95 2.58-2.15c-1.18-.73-2.03-2.13-2.03-3.63c0-1.2.6-2.08 1.43-2.58c.25-.15.5-.3.78-.4zM16.9 3.3c.98 0 1.95.53 2.55 1.33c-.93.63-1.95 1.05-3.1 1.05c-.95 0-1.93-.43-2.65-1.13c.98-.78 2.1-.98 3.2-.25z"
                />
              </svg>
              Continue with Apple
            </Button>
          </div>
          
          <div className="flex items-center w-full my-4">
            <Separator className="flex-1 bg-border" />
            <span className="px-4 text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailAuth} className="w-full space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 h-12"
                disabled={isAuthLoading}
              />
            </div>
             <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
              </svg>
              <Input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 h-12"
                disabled={isAuthLoading}
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base continue-button-pulse" disabled={isAuthLoading}>
              {isAuthLoading ? "Please wait..." : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6">
            {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="underline font-bold hover:text-foreground">
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>

          <p className="text-xs text-muted-foreground mt-8">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </m.div>
      </div>
    </main>
  );
}
