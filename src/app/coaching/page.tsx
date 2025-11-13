
'use client';

import { useState, memo, useCallback, useRef, useEffect } from 'react';
import { Bot, Mic, Send, Loader2, HeartHandshake, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { m, AnimatePresence } from 'framer-motion';
import { generateCoachingTip } from '@/ai/flows/ai-generated-coaching';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { doc } from 'firebase/firestore';

interface Message {
    id: number;
    type: 'user' | 'assistant';
    text: string;
    isEmergency: boolean;
    suggestions?: string[];
}

const MessageBubble = memo(({ message, onSuggestionClick }: { message: Message; onSuggestionClick: (query: string) => void; }) => {
  const isUser = message.type === 'user';
  
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-2"
    >
        <div className={cn("flex items-end gap-2", isUser ? 'justify-end' : 'justify-start')}>
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
        </div>
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
            <m.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-2 pl-12"
            >
                {message.suggestions.map((suggestion, index) => (
                    <Badge 
                        key={index}
                        variant="outline" 
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => onSuggestionClick(suggestion)}
                    >
                        {suggestion}
                    </Badge>
                ))}
            </m.div>
        )}
    </m.div>
  );
});
MessageBubble.displayName = 'MessageBubble';

const EmergencyAlert = memo(({ message }: { message: Message }) => (
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
));
EmergencyAlert.displayName = 'EmergencyAlert';

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

const QuickActionCard = memo(({ action, onQuickAction }: { action: any, onQuickAction: (query: string) => void }) => {
    const handleClick = useCallback(() => {
        onQuickAction(action.query)
    }, [onQuickAction, action.query]);

    return (
        <m.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
        >
            <Card className="text-center p-4 h-full flex flex-col justify-center items-center cursor-pointer glass-card">
                <div className="text-3xl mb-2">{action.icon}</div>
                <p className="text-sm font-semibold">{action.title}</p>
            </Card>
        </m.div>
    )
});
QuickActionCard.displayName = 'QuickActionCard';

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
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, type: 'assistant', text: "Hello! I'm your PCOS wellness assistant, Ovie. How can I help you today?", isEmergency: false, suggestions: [] }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading || !user || !userProfile || !firestore) {
            if (!user || !userProfile) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not find user profile. Please try again later.'
                });
            }
            return;
        }

        const newUserMessage: Message = { id: Date.now(), type: 'user', text, isEmergency: false };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const context = {
                userId: user.uid,
                userQuery: text,
                userProfile: {
                    wellnessGoal: userProfile.wellnessGoal || 'General Health',
                    pcosJourneyProgress: userProfile.pcosJourneyProgress || 1,
                },
                conversationHistory: userProfile.conversationHistory || [],
            };
            
            const result = await generateCoachingTip(context);
            
            let newAssistantMessage: Message;
            if (result.isEmergency) {
                newAssistantMessage = { id: Date.now() + 1, type: 'assistant', text: result.emergencyResponse, isEmergency: true, suggestions: [] };
            } else {
                newAssistantMessage = { id: Date.now() + 1, type: 'assistant', text: result.coachingTip, isEmergency: false, suggestions: result.suggestedFollowUps };
                
                // Save conversation to Firestore
                const userRef = doc(firestore, 'users', user.uid);
                const newHistoryEntry = {
                    userQuery: text,
                    aiResponse: result.coachingTip,
                    timestamp: new Date().toISOString(),
                };

                const updatedHistory = [
                    ...(userProfile.conversationHistory || []),
                    newHistoryEntry
                ].slice(-10); // Keep only the last 10 turns

                updateDocumentNonBlocking(userRef, {
                    conversationHistory: updatedHistory,
                });
            }
            setMessages(prev => [...prev, newAssistantMessage]);

        } catch (error) {
            const errorMessage: Message = {id: Date.now() + 1, type: 'assistant', text: "I'm sorry, I couldn't process that. Please try again.", isEmergency: false, suggestions: []};
            setMessages(prev => [...prev, errorMessage]);
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: 'Sorry, I had trouble generating a response. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, user, userProfile, firestore, toast]);
    
    const handleFormSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(inputValue);
    }, [handleSendMessage, inputValue]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    }, []);

    const handleSuggestionClick = useCallback((query: string) => {
        handleSendMessage(query);
    }, [handleSendMessage]);

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
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
                        : <MessageBubble key={message.id} message={message} onSuggestionClick={handleSuggestionClick} />
                )}
                {isLoading && <TypingIndicator />}
            </div>

            <form className="mt-auto p-4" onSubmit={handleFormSubmit}>
                <div className="relative">
                    <Input 
                        placeholder="Ask about your symptoms, cycle, or wellness..."
                        className="h-12 pl-12 pr-12 rounded-full glass-card-auth text-base"
                        value={inputValue}
                        onChange={handleInputChange}
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
