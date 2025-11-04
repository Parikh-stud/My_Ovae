'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Bell, Shield, Palette, User, Gem, LifeBuoy, Download, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { m } from 'framer-motion';
import { useFirestore, useUser, useAuth, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteUser } from "firebase/auth";
import { deleteAccountData } from "./actions/delete-account";

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
    
    const handleToggle = (id: string, enabled: boolean) => {
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
    };
    
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

const themePresets = [
  { id: 'hormonal-harmony', name: 'Hormonal Harmony', description: 'Dynamic colors that shift with your cycle.' },
  { id: 'lunar-cycle', name: 'Lunar Cycle', description: 'Moon phase inspired aesthetics.' },
  { id: 'botanical-balance', name: 'Botanical Balance', description: 'Nature and plant-based visuals.' },
  { id: 'minimal-wellness', name: 'Minimal Wellness', description: 'Clean design with reduced animations.' },
  { id: 'energy-adaptive', name: 'Energy Adaptive', description: 'Changes based on your energy and mood.' },
];

const AppearanceSettings = () => {
    const { theme, setTheme } = useTheme();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        if (user && firestore) {
            const userRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userRef, { themePreference: newTheme });
            const themeName = themePresets.find(t => t.id === newTheme)?.name || 'the new theme';
            toast({ title: "Theme Updated!", description: `Your theme has been set to ${themeName}.` });
        }
    }

    return (
        <SettingsSection title="Theme & Appearance" description="Personalize the look and feel of the app.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {themePresets.map(preset => (
                     <m.div
                        key={preset.id}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => handleThemeChange(preset.id)}
                        className="cursor-pointer"
                    >
                        <Card className={cn(
                            "transition-all",
                            isMounted && theme === preset.id ? "ring-2 ring-primary border-primary" : "border-border"
                        )}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-lg">
                                    {preset.name}
                                    {isMounted && theme === preset.id && <CheckCircle2 className="text-primary" />}
                                </CardTitle>
                                <CardDescription className="text-xs">{preset.description}</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <div className={`h-16 rounded-md theme-${preset.id} border`}>
                                </div>
                            </CardContent>
                        </Card>
                    </m.div>
                ))}
            </div>
        </SettingsSection>
    )
}

const ProfileManagement = () => {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [displayName, setDisplayName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if(userProfile?.displayName) {
            setDisplayName(userProfile.displayName);
        }
    }, [userProfile]);

    const handleSaveProfile = () => {
        if (!user || !firestore || !displayName.trim()) return;
        setIsSaving(true);
        const userRef = doc(firestore, 'users', user.uid);
        const publicUserRef = doc(firestore, 'publicUserProfiles', user.uid);
        
        Promise.all([
             updateDocumentNonBlocking(userRef, { displayName }),
             updateDocumentNonBlocking(publicUserRef, { displayName })
        ]).then(() => {
            toast({ title: "Profile Updated", description: "Your display name has been changed." });
        }).catch(() => {
             toast({ variant: 'destructive', title: "Update Failed", description: "Could not save your profile." });
        }).finally(() => {
            setIsSaving(false);
        });
    }

    if (isProfileLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-24 self-end" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="max-w-sm"
                />
            </div>
            <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user?.email || ''} disabled className="max-w-sm" />
            </div>
             <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                Save Changes
            </Button>
        </div>
    )
};


const AccountDeletion = () => {
  const { toast } = useToast();
  const auth = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setDeleteError('No authenticated user found. Please sign in again and try deleting your account.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const idToken = await currentUser.getIdToken(true);
      await deleteAccountData({ idToken });
      await deleteUser(currentUser);

      toast({
        title: "Account Deleted",
        description: "Your account and stored data have been permanently removed."
      });
    } catch (error: any) {
      console.error('Account deletion failed', error);
      let message = 'An unexpected error occurred while deleting your account. Please try again.';

      if (error?.code === 'auth/requires-recent-login') {
        message = 'Please re-authenticate before deleting your account.';
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }

      setDeleteError(message);
      toast({
        variant: 'destructive',
        title: "Deletion Failed",
        description: message,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SettingsSection title="Delete Account" description="Permanently delete your account and all associated data. This action cannot be undone.">
      <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">
          This will permanently erase your authentication record and all related data.
        </p>
         <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Button>
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
                <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {isDeleting ? 'Deleting...' : 'Continue'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </div>
      {deleteError && (
        <p className="mt-2 text-sm text-destructive">
          {deleteError}
        </p>
      )}
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

    const handleToggle = (id: string, enabled: boolean) => {
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
    };

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
    const settingTabs = [
        { value: "Profile", icon: User },
        { value: "Notifications", icon: Bell },
        { value: "Privacy", icon: Shield },
        { value: "Appearance", icon: Palette },
        { value: "Subscription", icon: Gem },
        { value: "Support", icon: LifeBuoy },
    ];
    
     const { toast } = useToast();

    return (
        <div className="p-4 md:p-8 space-y-4">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-headline font-bold text-gradient flex items-center gap-3">
                    <Settings className="size-8" />
                    Settings & Profile
                </h1>
            </header>
            
            <Tabs defaultValue="Profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto">
                    {settingTabs.map(tab => (
                       <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col md:flex-row gap-2 h-12">
                           <tab.icon className="size-5" />
                           {tab.value}
                       </TabsTrigger>
                    ))}
                </TabsList>
                
                <TabsContent value="Profile" className="pt-6 space-y-6">
                    <SettingsSection title="Profile Management" description="Manage your personal information and public profile.">
                        <ProfileManagement />
                    </SettingsSection>
                    <SettingsSection title="Data Export" description="Export your data for personal use or to share with your doctor.">
                        <Button onClick={() => toast({ title: 'Export Requested', description: 'Your data export is being generated and will be emailed to you.' })}>
                            <Download className="mr-2" />
                            Request Full Data Export
                        </Button>
                    </SettingsSection>
                    <AccountDeletion />
                </TabsContent>
                <TabsContent value="Notifications" className="pt-6">
                   <NotificationSettings />
                </TabsContent>
                 <TabsContent value="Privacy" className="pt-6">
                    <PrivacySettings />
                </TabsContent>
                 <TabsContent value="Appearance" className="pt-6">
                    <AppearanceSettings />
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
                             <Button variant="outline" onClick={() => toast({title: "Opening Support", description: "You will be redirected to our support center."})}>Contact Support</Button>
                             <Button variant="outline" onClick={() => toast({title: "Feedback Form", description: "Thank you for helping us improve!"})}>Provide Feedback</Button>
                         </div>
                    </SettingsSection>
                </TabsContent>
            </Tabs>
        </div>
    );
}
