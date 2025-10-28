
'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, HeartPulse, Moon, Sparkles } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LivingBackground } from "@/components/living-background";
import { m } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";

const FeatureCard = ({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) => (
  <m.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="glass-card text-center h-full">
      <CardContent className="p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-bold font-headline mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  </m.div>
);

const featureHighlights = [
  {
    icon: <Moon className="size-6" />,
    title: "Intelligent Cycle Tracking",
    description: "AI-powered predictions and insights into your unique cycle.",
  },
  {
    icon: <HeartPulse className="size-6" />,
    title: "Symptom Constellation",
    description: "Visually map and understand the connections between your symptoms.",
  },
  {
    icon: <Sparkles className="size-6" />,
    title: "Personalized AI Coach",
    description: "Get daily guidance on nutrition, fitness, and mental wellness.",
  },
];


export default function LandingPage() {

  return (
    <main className="relative flex flex-col items-center min-h-screen p-4 overflow-hidden bg-background">
      <LivingBackground />

      <header className="w-full max-w-6xl z-10 flex justify-between items-center py-4">
        <Logo />
        <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
            </Button>
            <Button asChild className="continue-button-pulse">
                <Link href="/onboarding/welcome">Get Started Free</Link>
            </Button>
        </div>
      </header>

      <div className="w-full max-w-4xl z-10 flex flex-col items-center justify-center text-center flex-1 py-20">
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-center text-gradient mb-6">
                Your Personal Guide Through PCOS
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                MyOvae combines AI, data-driven insights, and a supportive community to help you navigate your wellness journey with confidence and clarity.
            </p>
            <Button size="lg" asChild className="h-14 text-lg continue-button-pulse">
                <Link href="/onboarding/welcome">
                    Start Your Journey <ArrowRight className="ml-2" />
                </Link>
            </Button>
        </m.div>
      </div>

       <div className="w-full max-w-6xl z-10 py-20">
            <div className="grid md:grid-cols-3 gap-8">
                {featureHighlights.map((feature, index) => (
                    <FeatureCard key={feature.title} {...feature} delay={0.5 + index * 0.2} />
                ))}
            </div>
       </div>

       <footer className="w-full max-w-6xl z-10 text-center py-8 text-muted-foreground text-sm">
            <div className="flex justify-center gap-4">
                <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
                <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            </div>
            <p className="mt-2">&copy; {new Date().getFullYear()} MyOvae. All rights reserved.</p>
       </footer>

    </main>
  );
}
