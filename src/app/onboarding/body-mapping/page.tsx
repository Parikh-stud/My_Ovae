
'use client';

import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LivingBackground } from '@/components/living-background';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const bodyZones = [
  {
    id: 'head',
    label: 'Head & Mind',
    symptoms: ['Headaches', 'Hair loss', 'Mood swings', 'Brain fog', 'Anxiety', 'Depression'],
    position: { top: '10%', left: '45%', width: '10%', height: '12%' },
    color: 'var(--colors-primary)'
  },
  {
    id: 'face',
    label: 'Face & Skin',
    symptoms: ['Acne', 'Excessive facial hair', 'Skin darkening', 'Oily skin'],
    position: { top: '18%', left: '44%', width: '12%', height: '8%' },
    color: 'var(--colors-secondary)'
  },
  {
    id: 'torso',
    label: 'Body & Metabolism',
    symptoms: ['Weight gain', 'Bloating', 'Fatigue', 'Difficulty losing weight'],
    position: { top: '30%', left: '40%', width: '20%', height: '20%' },
    color: 'var(--colors-chart-3)'
  },
  {
    id: 'pelvis',
    label: 'Reproductive',
    symptoms: ['Irregular periods', 'No periods', 'Heavy bleeding', 'Pelvic pain', 'Ovulation pain'],
    position: { top: '50%', left: '42%', width: '16%', height: '15%' },
    color: 'var(--colors-destructive)'
  }
];

const BodySilhouette = ({ onZoneClick, selectedZones }: { onZoneClick: (zone: any) => void; selectedZones: string[] }) => (
  <div className="relative w-full max-w-xs mx-auto aspect-[1/2]">
    <svg viewBox="0 0 150 300" className="w-full h-full" fill="hsl(var(--foreground) / 0.1)">
        <path d="M75 15C85 15 90 20 90 30S85 45 75 45S60 40 60 30S65 15 75 15ZM95 55L100 80L110 120L100 200L90 280H60L50 200L40 120L50 80L55 55H95Z"/>
    </svg>
    {bodyZones.map(zone => (
      <button
        key={zone.id}
        className={cn(
          "absolute rounded-full transition-all duration-300",
          selectedZones.includes(zone.id) ? 'animate-biopulse-resting' : 'hover:scale-105'
        )}
        style={{ 
            ...zone.position, 
            backgroundColor: selectedZones.includes(zone.id) ? `hsl(${zone.color} / 0.5)` : `hsl(${zone.color} / 0.2)`,
            backdropFilter: 'blur(5px)',
            border: `2px solid hsl(${zone.color})`,
            boxShadow: selectedZones.includes(zone.id) ? `0 0 20px hsl(${zone.color})`: 'none'
        }}
        onClick={() => onZoneClick(zone)}
        aria-label={`Select ${zone.label} symptoms`}
      />
    ))}
  </div>
);

const SymptomSelectorDialog = ({ zone, open, onOpenChange, onSave, savedSymptoms }: { zone: any | null, open: boolean, onOpenChange: (open: boolean) => void, onSave: (symptoms: any) => void, savedSymptoms: any }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<{[key: string]: number}>({});

  useEffect(() => {
    if (zone) {
      const existingSymptoms = savedSymptoms[zone.id] || {};
      setSelectedSymptoms(existingSymptoms);
    }
  }, [zone, savedSymptoms, open]);


  const handleToggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => {
      const newSymptoms = { ...prev };
      if (newSymptoms[symptom]) {
        delete newSymptoms[symptom];
      } else {
        newSymptoms[symptom] = 3; // Default severity
      }
      return newSymptoms;
    });
  };

  const handleSeverityChange = (symptom: string, value: number[]) => {
     setSelectedSymptoms(prev => ({
      ...prev,
      [symptom]: value[0]
    }));
  };
  
  const handleSave = () => {
    if(zone) {
      onSave({ [zone.id]: selectedSymptoms });
      onOpenChange(false);
    }
  }

  if (!zone) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-auth">
        <DialogHeader>
          <DialogTitle style={{color: `hsl(${zone.color})`}} className="text-2xl font-headline">{zone.label}</DialogTitle>
          <DialogDescription>Select the symptoms you're experiencing and rate their severity.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {zone.symptoms.map((symptom: string) => (
            <div key={symptom} className="p-4 rounded-lg bg-black/20">
              <div className="flex items-center justify-between">
                <label 
                  className={cn("text-lg", selectedSymptoms[symptom] ? 'text-foreground' : 'text-muted-foreground')}
                  htmlFor={`symptom-${symptom}`}
                >
                  {symptom}
                </label>
                <button onClick={() => handleToggleSymptom(symptom)} className={cn("size-7 rounded-md border-2 flex items-center justify-center transition-all", selectedSymptoms[symptom] ? 'bg-primary border-primary' : 'border-foreground/50')}>
                   {selectedSymptoms[symptom] && <Check className="size-5 text-primary-foreground" />}
                </button>
              </div>
              {selectedSymptoms[symptom] && (
                 <m.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4"
                >
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Severity</span>
                         <Slider
                            value={[selectedSymptoms[symptom]]}
                            onValueChange={(value) => handleSeverityChange(symptom, value)}
                            min={1}
                            max={5}
                            step={1}
                            className="w-full"
                         />
                         <span className="font-bold text-lg" style={{color: `hsl(${zone.color})`}}>{selectedSymptoms[symptom]}</span>
                    </div>
                </m.div>
              )}
            </div>
          ))}
        </div>
         <Button onClick={handleSave} className="w-full mt-4 continue-button-pulse">Save Symptoms</Button>
      </DialogContent>
    </Dialog>
  )
}

export default function BodyMappingPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedZone, setSelectedZone] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mappedSymptoms, setMappedSymptoms] = useState<{[key: string]: {[key: string]: number}}>({});
  
  const handleZoneClick = (zone: any) => {
    setSelectedZone(zone);
    setIsModalOpen(true);
  };
  
  const handleSaveSymptoms = (newSymptoms: any) => {
    setMappedSymptoms(prev => ({ ...prev, ...newSymptoms}));
  };

  const selectedZones = Object.keys(mappedSymptoms).filter(zoneId => Object.keys(mappedSymptoms[zoneId]).length > 0);
  const totalSymptoms = Object.values(mappedSymptoms).reduce((acc, zone) => acc + Object.keys(zone).length, 0);

  const handleNext = () => {
    if (user && firestore) {
        const userRef = doc(firestore, 'users', user.uid);
        updateDocumentNonBlocking(userRef, {
            'onboarding.symptoms': mappedSymptoms,
            'onboarding.currentStep': 'notifications',
        });
        router.push('/onboarding/notifications');
    } else {
         toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not identify user. Please try logging in again.",
        });
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
      <LivingBackground />
      <div className="z-10 flex flex-col items-center justify-center text-center w-full max-w-2xl space-y-6">
        <div className="w-full px-4">
          <h3 className="text-sm font-body text-muted-foreground mb-2">Step 3 of 7</h3>
          <Progress value={42} className="h-2 bg-muted/50" />
        </div>
        
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-center text-gradient">Map Your Symptoms</h1>
            <p className="text-muted-foreground mt-2">Tap a body area to log the symptoms you're feeling.</p>
        </m.div>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-4">
            <div className="order-2 md:order-1 col-span-1 space-y-2 text-right">
                {bodyZones.slice(0, 2).map(zone => (
                    <Badge key={zone.id} variant={selectedZones.includes(zone.id) ? 'default' : 'outline'} style={{borderColor: `hsl(${zone.color})`, color: selectedZones.includes(zone.id) ? 'hsl(var(--primary-foreground))' : `hsl(${zone.color})`}} className={cn("cursor-pointer", selectedZones.includes(zone.id) && `bg-primary`)} onClick={() => handleZoneClick(zone)}>{zone.label}</Badge>
                ))}
            </div>

            <div className="order-1 md:order-2 col-span-1">
                <BodySilhouette onZoneClick={handleZoneClick} selectedZones={selectedZones} />
            </div>

            <div className="order-3 md:order-3 col-span-1 space-y-2 text-left">
                 {bodyZones.slice(2, 4).map(zone => (
                     <Badge key={zone.id} variant={selectedZones.includes(zone.id) ? 'default' : 'outline'} style={{borderColor: `hsl(${zone.color})`, color: selectedZones.includes(zone.id) ? 'hsl(var(--primary-foreground))' : `hsl(${zone.color})`}} className={cn("cursor-pointer", selectedZones.includes(zone.id) && `bg-primary`)} onClick={() => handleZoneClick(zone)}>{zone.label}</Badge>
                ))}
            </div>
        </div>

        <div className="text-center">
            <p className="font-bold text-lg">{totalSymptoms} symptom{totalSymptoms !== 1 && 's'} mapped</p>
            <p className="text-sm text-muted-foreground">You can always add more later.</p>
        </div>


        <div className="flex flex-col items-center justify-center pt-6 gap-2">
          <Button 
            size="lg" 
            className="h-16 continue-button-pulse text-lg"
            onClick={handleNext}
          >
            Continue <ArrowRight className="ml-2" />
          </Button>
          <Button variant="link" onClick={handleNext}>Skip for now</Button>
        </div>
      </div>
      <SymptomSelectorDialog zone={selectedZone} open={isModalOpen} onOpenChange={setIsModalOpen} onSave={handleSaveSymptoms} savedSymptoms={mappedSymptoms} />
    </div>
  );
}
