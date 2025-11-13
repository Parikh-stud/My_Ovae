
'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LifeBuoy, Send, MessageSquare, BookOpen, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";

const faqData = [
  {
    question: "How does the AI coaching work?",
    answer: "Our AI coach, Ovie, analyzes your logged data (symptoms, cycle, nutrition) to provide personalized, actionable tips. It's designed to be a supportive companion on your wellness journey, offering insights based on the patterns it observes.",
  },
  {
    question: "Is my health data secure?",
    answer: "Absolutely. Your privacy is our top priority. All personal and health data is encrypted both in transit and at rest. You have full control over your data and can manage sharing settings in the 'Privacy' section of the Settings page.",
  },
  {
    question: "How are my PCOS-Friendly Scores calculated?",
    answer: "When you log a meal (either by photo or text), our AI analyzes the ingredients based on established nutritional guidelines for PCOS management, considering factors like glycemic index, anti-inflammatory properties, and hormonal impact to generate a score.",
  },
  {
    question: "How do I track my cycle accurately?",
    answer: "Go to the 'Cycle Tracker' page and use the calendar to log the start and end dates of your period. The more consistent you are, the more accurate our AI-powered predictions for future cycles, ovulation, and fertile windows will become.",
  },
];

const ContactSupportForm = () => {
    const { user } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        email: user?.email || '',
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({...prev, [id]: value}));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: "Message Sent!",
                description: "Thank you for reaching out. Our support team will get back to you shortly.",
            });
            setFormData(prev => ({...prev, message: ''}));
        }, 1500);
    }
    
    return (
         <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="text-primary"/> Contact Support</CardTitle>
                <CardDescription>Have a question or need assistance? Fill out the form below.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input id="name" placeholder="Your Name" value={formData.name} onChange={handleChange} required disabled={isLoading} />
                        <Input id="email" type="email" placeholder="Your Email" value={formData.email} onChange={handleChange} required disabled={isLoading} />
                    </div>
                    <Textarea id="message" placeholder="Describe your issue or question..." className="h-40 bg-background/50" value={formData.message} onChange={handleChange} required disabled={isLoading} />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isLoading || !formData.message}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                        Send Message
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

const FaqSection = () => {
    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Find answers to common questions about MyOvae.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {faqData.map((faq, index) => (
                        <AccordionItem value={`item-${index}`} key={index}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    )
}

const QuickLinks = () => {
    return (
         <Card className="glass-card">
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="text-secondary"/> Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <Button variant="outline" asChild className="justify-start">
                    <Link href="/terms">Terms of Service</Link>
                </Button>
                 <Button variant="outline" asChild className="justify-start">
                    <Link href="/privacy">Privacy Policy</Link>
                </Button>
            </CardContent>
        </Card>
    )
}


export default function SupportPage() {
    const router = useRouter();

    return (
        <div className="p-4 md:p-8 space-y-8">
            <header className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-3xl font-headline font-bold text-gradient flex items-center gap-3">
                        <LifeBuoy className="size-8" />
                        Help & Support
                    </h1>
                    <p className="text-muted-foreground mt-1">We're here to help you on your wellness journey.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ContactSupportForm />
                </div>
                <div className="space-y-8">
                    <QuickLinks />
                </div>
            </div>

            <div>
                <FaqSection />
            </div>
        </div>
    );
}
