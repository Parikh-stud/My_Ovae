
'use client';

import React, { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LivingBackground } from '@/components/living-background';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


const questionFlow = {
  initial: {
    id: 'diagnosis_status',
    question: 'Where are you in your PCOS journey?',
    options: [
      { value: 'diagnosed', label: 'I have been diagnosed with PCOS', nextPath: 'diagnosed_flow' },
      { value: 'suspecting', label: 'I suspect I might have PCOS', nextPath: 'suspecting_flow' },
      { value: 'exploring', label: 'I\'m exploring my symptoms', nextPath: 'symptom_flow' },
      { value: 'supporting', label: 'Supporting someone with PCOS', nextPath: 'support_flow' }
    ],
    type: 'single_select',
  },
  diagnosed_flow: [
    {
      id: 'diagnosis_date',
      question: 'When were you diagnosed?',
      type: 'single_select',
      options: ['Less than 6 months ago', '6 months - 1 year', '1-3 years', 'More than 3 years']
    },
    {
      id: 'main_goals',
      question: 'What\'s your primary focus right now?',
      type: 'single_select',
      options: ['Managing symptoms', 'Fertility/Conception', 'Weight management', 'Mental health', 'Understanding PCOS better']
    }
  ],
  suspecting_flow: [
    {
      id: 'symptoms_experiencing',
      question: 'Which symptoms are you experiencing?',
      type: 'multi_select',
      options: ['Irregular periods', 'Excess hair growth', 'Acne', 'Weight gain', 'Hair loss', 'Mood changes']
    },
    {
      id: 'doctor_visit',
      question: 'Have you discussed this with a healthcare provider?',
      type: 'single_select',
      options: ['Yes, awaiting tests', 'Yes, tests inconclusive', 'Not yet', 'Planning to']
    }
  ],
  symptom_flow: [
      {
        id: 'symptom_duration',
        question: 'How long have you been experiencing symptoms?',
        type: 'single_select',
        options: ['Less than 3 months', '3-6 months', '6-12 months', 'More than a year']
      },
  ],
  support_flow: [
      {
        id: 'relation',
        question: 'Who are you supporting?',
        type: 'single_select',
        options: ['Partner', 'Friend', 'Family Member', 'Other']
      }
  ]
};


const JourneyQuestion = ({ question, options, type, onAnswer, selectedAnswers }: any) => {
    const handleSelect = (option: string) => {
        if (type === 'multi_select') {
            const newSelection = selectedAnswers.includes(option)
                ? selectedAnswers.filter((item: string) => item !== option)
                : [...selectedAnswers, option];
            onAnswer(newSelection);
        } else {
            onAnswer([option]);
        }
    };

    return (
        <m.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
            className="w-full"
        >
            <h2 className="text-3xl font-headline font-bold text-center text-gradient mb-8">{question}</h2>
            <div className="flex flex-col gap-4 items-center">
                {options.map((option: any, index: number) => {
                    const label = typeof option === 'string' ? option : option.label;
                    const value = typeof option === 'string' ? option : option.value;
                    const isSelected = selectedAnswers.includes(value);

                    return (
                        <m.button
                            key={index}
                            onClick={() => handleSelect(value)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                                "glass-card-auth w-full max-w-lg p-4 rounded-xl text-left flex items-center justify-between transition-all duration-300",
                                isSelected ? 'border-primary ring-2 ring-primary' : 'border-white/20'
                            )}
                        >
                            <span className="text-lg font-body">{label}</span>
                             {type === 'multi_select' ? (
                                <div className={cn("size-6 rounded-md border-2 flex items-center justify-center transition-all", isSelected ? 'bg-primary border-primary' : 'border-white/50')}>
                                    {isSelected && <Check className="size-4 text-white" />}
                                </div>
                            ) : (
                                <div className={cn("size-6 rounded-full border-2 flex items-center justify-center transition-all", isSelected ? 'bg-primary border-primary' : 'border-white/50')}>
                                    {isSelected && <div className="size-3 rounded-full bg-white" />}
                                </div>
                            )}
                        </m.button>
                    );
                })}
            </div>
        </m.div>
    );
};

export default function JourneyStatusPage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [journeyPath, setJourneyPath] = useState<string | null>(null);
    const [answers, setAnswers] = useState<{ [key: string]: string[] }>({});

    const handleAnswer = (questionId: string, answer: string[]) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const saveProgressAndNavigate = () => {
        if (!user || !firestore) {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "Could not save progress. Please log in again.",
            });
            return;
        }
        
        const userRef = doc(firestore, 'users', user.uid);
        updateDocumentNonBlocking(userRef, {
            'onboarding.journeyStatus': answers,
            'onboarding.currentStep': 'body-mapping',
        }).then(() => {
            router.push('/onboarding/body-mapping');
        }).catch(() => {
            toast({
                variant: "destructive",
                title: "Save Error",
                description: "Could not save your progress. Please try again.",
            });
        });
    };


    const handleNext = () => {
        if (!journeyPath) {
            const initialAnswer = answers.diagnosis_status[0];
            const nextPath = questionFlow.initial.options.find(o => o.value === initialAnswer)?.nextPath;
            if (nextPath) {
                const pathQuestions = (questionFlow as any)[nextPath || ''];
                if (!pathQuestions || pathQuestions.length === 0) {
                    saveProgressAndNavigate();
                } else {
                    setCurrentStep(0);
                    setJourneyPath(nextPath);
                }
            } else {
                 saveProgressAndNavigate();
            }
        } else {
            const pathQuestions = (questionFlow as any)[journeyPath];
            if (currentStep < pathQuestions.length - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                saveProgressAndNavigate();
            }
        }
    };
    
    const getCurrentQuestion = () => {
        if (!journeyPath) return questionFlow.initial;
        const pathQuestions = (questionFlow as any)[journeyPath];
        return pathQuestions[currentStep];
    }

    const currentQuestion = getCurrentQuestion();
    const totalQuestionsInPath = journeyPath ? (questionFlow as any)[journeyPath].length : 0;
    const progress = journeyPath ? ((currentStep + 1) / totalQuestionsInPath) * 14 : (currentStep / 1) * 14;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
      <LivingBackground />
        <div className="z-10 flex flex-col items-center justify-center text-center w-full max-w-2xl space-y-8">
            <div className="w-full px-4">
                <h3 className="text-sm font-body text-muted-foreground mb-2">Step 2 of 7</h3>
                <Progress value={14 + progress} className="h-2 bg-muted/50" />
            </div>

            <AnimatePresence mode="wait">
                <m.div
                    key={currentQuestion.id}
                >
                    <JourneyQuestion
                        {...currentQuestion}
                        onAnswer={(answer: string[]) => handleAnswer(currentQuestion.id, answer)}
                        selectedAnswers={answers[currentQuestion.id] || []}
                    />
                </m.div>
            </AnimatePresence>

            <div className="flex items-center justify-center pt-8">
              <Button 
                size="lg" 
                className="h-16 continue-button-pulse text-lg" 
                disabled={(answers[currentQuestion.id] || []).length === 0}
                onClick={handleNext}
              >
                Continue <ArrowRight className="ml-2" />
              </Button>
            </div>

        </div>
    </div>
  );
}
