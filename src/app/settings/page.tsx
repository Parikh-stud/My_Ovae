
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Bell, Shield, User, Gem, LifeBuoy, Download, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFirestore, useUser, useAuth, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useCallback } from "react";
import { useUserProfile } from "@/hooks/use-user-profile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton";
import { deleteUser } from "firebase/auth";
import { useRouter } from "next/navigation";

const SettingsSection = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
    <Card className="glass-card">
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
);

const notificationTypes = [
    { id: "symptoms", label: "Symptom Reminders", description: "Morning and evening check-ins." },
    { id: "insights", label: "Weekly Insights", description: "Personalized summaries of your data." },
    { id: "community", label: "Community Updates", description: "Notifications from The Sisterhood." },
];

const NotificationSettings = () => {
    const { userProfile, isLoading } = useUserProfile();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [preferences, setPreferences] = useState<{[key: string]: boolean}>({});
    const [isSaving, setIsSaving] = useState<string | null>(null);

    useEffect(() => {
        if (userProfile?.onboarding?.notificationPreferences) {
            setPreferences(userProfile.onboarding.notificationPreferences);
        } else if (userProfile) {
            const defaultPrefs: {[key: string]: boolean} = {};
            notificationTypes.forEach(t => defaultPrefs[t.id] = t.id !== 'community');
            setPreferences(defaultPrefs);
        }
    }, [userProfile]);
    
    const handleToggle = useCallback((id: string, enabled: boolean) => {
        const newPreferences = { ...preferences, [id]: enabled };
        setPreferences(newPreferences);
        setIsSaving(id);

        if (user && firestore) {
            const userRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userRef, {
                'onboarding.notificationPreferences': newPreferences
            }).then(() => {
                 toast({ title: "Preferences Updated", description: `${notificationTypes.find(t => t.id === id)?.label} notifications ${enabled ? 'enabled' : 'disabled'}.` });
            }).catch(() => {
                 toast({ variant: 'destructive', title: "Update Failed", description: "Could not save your preferences." });
                 // Revert UI on failure
                 setPreferences(prev => ({...prev, [id]: !enabled}));
            }).finally(() => {
                setIsSaving(null);
            });
        }
    }, [preferences, user, firestore, toast]);
    
    if (isLoading) {
        return (
            <div className="space-y-4">
                {notificationTypes.map(type => (
                    <div key={type.id} className="flex items-center justify-between p-4 rounded-lg bg-black/20 h-20">
                         <div className="space-y-2">
                           <Skeleton className="h-5 w-32" />
                           <Skeleton className="h-4 w-48" />
                         </div>
                         <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <SettingsSection title="Notification Types" description="Choose which notifications to receive.">
                 <div className="space-y-4">
                    {notificationTypes.map(type => (
                        <div key={type.id} className="flex items-center justify-between p-4 rounded-lg bg-black/20">
                            <div>
                                <Label htmlFor={`notif-${type.id}`} className="text-base">{type.label}</Label>
                                <p className="text-sm text-muted-foreground">{type.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isSaving === type.id && <Loader2 className="animate-spin size-4" />}
                                <Switch 
                                    id={`notif-${type.id}`} 
                                    checked={preferences[type.id] ?? false}
                                    onCheckedChange={(checked) => handleToggle(type.id, checked)}
                                    disabled={!!isSaving}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </SettingsSection>
        </div>
    )
}

const AccountDeletion = () => {
  const { toast } = useToast();
  const auth = useAuth();
  
  const handleDeleteAccount = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            await deleteUser(currentUser);
            toast({
                title: "Account Deleted",
                description: "Your account has been permanently deleted."
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Deletion Failed",
                description: `An error occurred: ${error.message}. Please try re-authenticating and trying again.`
            });
        }
    }
  }, [auth, toast]);

  return (
    <SettingsSection title="Delete Account" description="Permanently delete your account and all associated data. This action cannot be undone.">
      <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">
          This will permanently erase your authentication record and all related data.
        </p>
         <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and all of your data. You will be logged out immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </div>
    </SettingsSection>
  );
};

const PrivacySettings = () => {
    const { userProfile, isLoading } = useUserProfile();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [preferences, setPreferences] = useState<{ [key: string]: boolean }>({});
    const [isSaving, setIsSaving] = useState<string | null>(null);

    const privacySettings = [
        { id: 'provider_sharing', label: 'Healthcare Provider Access', description: 'Allow connected providers to view your data.' },
        { id: 'research_contribution', label: 'Anonymous Research', description: 'Contribute anonymized data to PCOS research.' },
    ];
    
    useEffect(() => {
        if (userProfile?.onboarding?.privacySettings) {
            setPreferences(userProfile.onboarding.privacySettings);
        } else if (userProfile) {
             setPreferences({ provider_sharing: false, research_contribution: true });
        }
    }, [userProfile]);

    const handleToggle = useCallback((id: string, enabled: boolean) => {
        const newPreferences = { ...preferences, [id]: enabled };
        setPreferences(newPreferences);
        setIsSaving(id);

        if (user && firestore) {
            const userRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userRef, {
                'onboarding.privacySettings': newPreferences
            }).then(() => {
                 toast({ title: "Privacy Setting Updated", description: `${privacySettings.find(s => s.id === id)?.label} has been ${enabled ? 'enabled' : 'disabled'}.` });
            }).catch(() => {
                 toast({ variant: 'destructive', title: "Update Failed", description: "Could not save your preference." });
                 setPreferences(prev => ({ ...prev, [id]: !enabled }));
            }).finally(() => {
                setIsSaving(null);
            });
        }
    }, [preferences, user, firestore, toast]);

    if (isLoading) return <Skeleton className="h-40 w-full" />;

    return (
        <SettingsSection title="Privacy & Data Sharing" description="You are in control of your data.">
             <div className="space-y-4">
                {privacySettings.map(setting => (
                    <div key={setting.id} className="flex items-center justify-between p-4 rounded-lg bg-black/20">
                        <div>
                            <Label htmlFor={`privacy-${setting.id}`} className="text-base">{setting.label}</Label>
                            <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                         <div className="flex items-center gap-2">
                            {isSaving === setting.id && <Loader2 className="animate-spin size-4" />}
                            <Switch 
                                id={`privacy-${setting.id}`} 
                                checked={preferences[setting.id] ?? false}
                                onCheckedChange={(checked) => handleToggle(setting.id, checked)}
                                disabled={!!isSaving}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </SettingsSection>
    );
};


export default function SettingsPage() {
    const router = useRouter();
    const settingTabs = [
        { value: "Notifications", icon: Bell },
        { value: "Privacy", icon: Shield },
        { value: "Subscription", icon: Gem },
        { value: "Support", icon: LifeBuoy },
        { value: "Account", icon: User },
    ];
    
     const { toast } = useToast();

    const handleRequestExport = useCallback(() => {
        toast({ title: 'Export Requested', description: 'Your data export is being generated and will be emailed to you.' })
    }, [toast]);
    
    const handleContactSupport = useCallback(() => {
        toast({title: "Opening Support", description: "You will be redirected to our support center."});
    }, [toast]);

    const handleProvideFeedback = useCallback(() => {
        toast({title: "Feedback Form", description: "Thank you for helping us improve!"});
    }, [toast]);

    return (
        <div className="p-4 md:p-8 space-y-4">
            <header className="flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-3xl font-headline font-bold text-gradient flex items-center gap-3">
                        <Settings className="size-8" />
                        Settings
                    </h1>
                </div>
            </header>
            
            <Tabs defaultValue="Notifications" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
                    {settingTabs.map(tab => (
                       <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col md:flex-row gap-2 h-12">
                           <tab.icon className="size-5" />
                           {tab.value}
                       </TabsTrigger>
                    ))}
                </TabsList>
                
                <TabsContent value="Notifications" className="pt-6">
                   <NotificationSettings />
                </TabsContent>
                 <TabsContent value="Privacy" className="pt-6">
                    <PrivacySettings />
                </TabsContent>
                 <TabsContent value="Subscription" className="pt-6">
                    <SettingsSection title="Your Subscription" description="Manage your subscription plan.">
                        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-gradient">MyOvae Premium</h3>
                                <p className="text-sm text-muted-foreground">Next billing date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </SettingsSection>
                </TabsContent>
                 <TabsContent value="Support" className="pt-6">
                    <SettingsSection title="Help & Support" description="Get help or provide feedback.">
                         <div className="flex gap-4">
                             <Button variant="outline" onClick={handleContactSupport}>Contact Support</Button>
                             <Button variant="outline" onClick={handleProvideFeedback}>Provide Feedback</Button>
                         </div>
                    </SettingsSection>
                </TabsContent>
                 <TabsContent value="Account" className="pt-6 space-y-6">
                    <SettingsSection title="Data Export" description="Export your data for personal use or to share with your doctor.">
                        <Button onClick={handleRequestExport}>
                            <Download className="mr-2" />
                            Request Full Data Export
                        </Button>
                    </SettingsSection>
                    <AccountDeletion />
                </TabsContent>
            </Tabs>
        </div>
    );
}
