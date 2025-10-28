
'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import { Bot, Mic, Send, Loader2, HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { m } from 'framer-motion';
import { generateCoachingTip } from '@/ai/flows/ai-generated-coaching';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUserProfile } from '@/hooks/use-user-profile';
import { differenceInDays } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

const MessageBubble = memo(({ message }: { message: any }) => {
  const isUser = message.type === 'user';
  
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-end gap-2", isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <Avatar>
          <AvatarFallback className="bg-primary/20 text-primary">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      <div 
        className={cn(
          "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl", 
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-none" 
            : "bg-muted rounded-bl-none"
        )}
      >
        <p className="text-sm">{message.text}</p>
      </div>
    </m.div>
  );
});
MessageBubble.displayName = 'MessageBubble';

const EmergencyAlert = ({ message }: { message: any }) => (
    <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
    >
        <Alert variant="destructive" className="glass-card border-2 border-destructive/50">
            <HeartHandshake className="size-5" />
            <AlertTitle className="font-bold">Emergency Support</AlertTitle>
            <AlertDescription>
                <p className="mb-4">{message.text}</p>
                <div className="flex gap-4">
                    <Button asChild>
                        <Link href="tel:911">Call 911 for Emergencies</Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="sms:988">Text 988</Link>
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    </m.div>
);

const TypingIndicator = () => (
    <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-1.5"
    >
        <Avatar>
          <AvatarFallback className="bg-primary/20 text-primary">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-1 p-3 bg-muted rounded-2xl rounded-bl-none">
            <m.span initial={{ y: 0 }} animate={{ y: [0, -4, 0] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0 }} className="size-2 bg-muted-foreground rounded-full" />
            <m.span initial={{ y: 0 }} animate={{ y: [0, -4, 0] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }} className="size-2 bg-muted-foreground rounded-full" />
            <m.span initial={{ y: 0 }} animate={{ y: [0, -4, 0] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }} className="size-2 bg-muted-foreground rounded-full" />
        </div>
    </m.div>
)

const QuickActionCard = ({ action, onQuickAction }: { action: any, onQuickAction: (query: string) => void }) => (
    <m.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onQuickAction(action.query)}
    >
        <Card className="text-center p-4 h-full flex flex-col justify-center items-center cursor-pointer">
            <div className="text-3xl mb-2">{action.icon}</div>
            <p className="text-sm font-semibold">{action.title}</p>
        </Card>
    </m.div>
)

const quickActions = [
    { 
      icon: '🥗', 
      title: 'Review My Last Meal',
      query: 'What do you think of my last logged meal?'
    },
    { 
      icon: '💪', 
      title: 'Suggest a Workout',
      query: 'What workout should I do today?'
    },
    { 
      icon: '😴', 
      title: 'Help with Fatigue',
      query: 'I feel really tired today, what can I do?'
    },
    { 
      icon: '💡', 
      title: 'Give me one tip',
      query: 'Give me one simple tip for today based on my data.'
    },
];

export default function AIHealthAssistantPage() {
    const [messages, setMessages] = useState([
        { id: 1, type: 'assistant', text: "Hello! I'm your PCOS wellness assistant, Ovie. How can I help you today?", isEmergency: false }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const { userProfile } = useUserProfile();
    
    // --- Data Hooks for AI Context ---
    const symptomsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/symptomLogs`), orderBy('timestamp', 'desc'), limit(5));
    }, [user, firestore]);
    const { data: recentSymptoms } = useCollection(symptomsQuery);

    const mealsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/nutritionLogs`), orderBy('loggedAt', 'desc'), limit(5));
    }, [user, firestore]);
    const { data: recentMeals } = useCollection(mealsQuery);

    const workoutsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/fitnessActivities`), orderBy('completedAt', 'desc'), limit(5));
    }, [user, firestore]);
    const { data: recentWorkouts } = useCollection(workoutsQuery);
    
    const cyclesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/cycles`), orderBy('startDate', 'desc'), limit(1));
    }, [user, firestore]);
    const { data: cyclesData } = useCollection(cyclesQuery);
    const latestCycle = useMemo(() => cyclesData?.[0], [cyclesData]);
    
    const labResultsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/labResults`), orderBy('testDate', 'desc'), limit(3));
    }, [user, firestore]);
    const { data: recentLabResults } = useCollection(labResultsQuery);
    // --- End Data Hooks ---

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return;

        const newUserMessage = { id: Date.now(), type: 'user', text, isEmergency: false };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // --- Build Comprehensive Context for AI ---
            const cycleDay = latestCycle?.startDate ? differenceInDays(new Date(), (latestCycle.startDate as any).toDate()) + 1 : null;
            const cycleContext = cycleDay ? `Currently on day ${cycleDay} of her cycle.` : "No current cycle data available.";

            const context = {
                pcosJourneyProgress: userProfile?.pcosJourneyProgress || 1,
                recentSymptoms: JSON.stringify(recentSymptoms || []),
                cycleData: cycleContext,
                nutritionData: JSON.stringify(recentMeals || []),
                fitnessData: JSON.stringify(recentWorkouts || []),
                labResultData: JSON.stringify(recentLabResults || []),
                userQuery: text,
            };
            // --- End Context Building ---

            const result = await generateCoachingTip(context);

            let newAssistantMessage;
            if (result.isEmergency) {
                newAssistantMessage = { id: Date.now() + 1, type: 'assistant', text: result.emergencyResponse, isEmergency: true };
            } else {
                newAssistantMessage = { id: Date.now() + 1, type: 'assistant', text: result.coachingTip, isEmergency: false };
            }
            setMessages(prev => [...prev, newAssistantMessage]);

        } catch (error) {
            const errorMessage = {id: Date.now() + 1, type: 'assistant', text: "I'm sorry, I couldn't process that. Please try again.", isEmergency: false};
            setMessages(prev => [...prev, errorMessage]);
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: 'Sorry, I had trouble generating a response. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, recentSymptoms, recentMeals, recentWorkouts, latestCycle, recentLabResults, toast, userProfile]);
    
    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] p-4">
            <div className="flex items-center gap-4 p-4 border-b border-border">
                <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                    <div className="relative size-12">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-secure" />
                        <div className="absolute inset-1 rounded-full bg-primary/30 animate-pulse-secure animation-delay-300" />
                        <div className="absolute inset-2 flex items-center justify-center rounded-full bg-primary/80">
                           <Bot className="text-primary-foreground" size={24} />
                        </div>
                    </div>
                </m.div>
                <div>
                    <h1 className="text-xl font-bold font-headline">Ovie</h1>
                    <p className="text-sm text-muted-foreground">{isListening ? 'Listening...' : isLoading ? 'Thinking...' : 'Ready to help'}</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 1 && !isLoading && (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                         {quickActions.map(action => (
                            <QuickActionCard key={action.title} action={action} onQuickAction={handleSendMessage} />
                         ))}
                    </div>
                )}
                {messages.map(message =>
                    message.isEmergency
                        ? <EmergencyAlert key={message.id} message={message} />
                        : <MessageBubble key={message.id} message={message} />
                )}
                {isLoading && <TypingIndicator />}
            </div>

            <form className="mt-auto p-4" onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}>
                <div className="relative">
                    <Input 
                        placeholder="Ask about your symptoms, cycle, or wellness..."
                        className="h-12 pl-12 pr-12 rounded-full glass-card-auth text-base"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={isLoading}
                    />
                    <button type="button" className={cn("absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors", isListening ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                        <Mic size={20} />
                    </button>
                    <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-9 w-9" disabled={!inputValue.trim() || isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    </Button>
                </div>
            </form>
        </div>
    );
}
