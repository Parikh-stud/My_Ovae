
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Loader2, Save, ArrowLeft, CalendarIcon, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useCallback } from "react";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const wellnessGoals = [
    "Hormone Balance",
    "Symptom Management",
    "Cycle Regulation",
    "Fertility",
    "Weight Management",
    "Mental Wellness",
    "General Health"
];

const ProfileManagement = () => {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [dob, setDob] = useState<Date | undefined>();
    const [journeyStartDate, setJourneyStartDate] = useState<Date | undefined>();
    const [wellnessGoal, setWellnessGoal] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || '');
            setPhotoURL(userProfile.photoURL || '');
            if (userProfile.dob) {
                setDob(new Date(userProfile.dob));
            }
            if (userProfile.journeyStartDate) {
                setJourneyStartDate(new Date(userProfile.journeyStartDate));
            }
            setWellnessGoal(userProfile.wellnessGoal || '');
        }
    }, [userProfile]);

    const handleSaveProfile = useCallback(async () => {
        if (!user || !firestore || !displayName.trim()) return;
        setIsSaving(true);
        
        const userRef = doc(firestore, 'users', user.uid);
        const publicUserRef = doc(firestore, 'publicUserProfiles', user.uid);
        
        const privateData: any = { 
            displayName, 
            photoURL,
            dob: dob ? dob.toISOString() : null,
            journeyStartDate: journeyStartDate ? journeyStartDate.toISOString() : null,
            wellnessGoal
        };
        const publicData = { displayName, photoURL };

        try {
            await Promise.all([
                 updateDocumentNonBlocking(userRef, privateData),
                 updateDocumentNonBlocking(publicUserRef, publicData)
            ]);
            toast({ title: "Profile Updated", description: "Your profile information has been saved." });
        } catch(e) {
             toast({ variant: 'destructive', title: "Update Failed", description: "Could not save your profile." });
        } finally {
            setIsSaving(false);
        }
    }, [user, firestore, displayName, photoURL, dob, journeyStartDate, wellnessGoal, toast]);

    if (isProfileLoading) {
        return (
            <div className="space-y-8">
                 <div className="flex items-center gap-6">
                    <Skeleton className="size-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="space-y-4 pt-4 max-w-sm">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-5 w-24 mt-4" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-12 w-32 mt-6" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-6">
                 <div className="relative group">
                    <Avatar className="size-24 border-4 border-primary">
                        <AvatarImage src={photoURL || `https://picsum.photos/seed/${user?.uid}/200/200`} />
                        <AvatarFallback className="text-3xl">{displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Upload className="text-white" />
                    </div>
                 </div>
                <div>
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <p className="text-muted-foreground">{user?.email}</p>
                </div>
            </div>
            <div className="space-y-4 max-w-sm">
                <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input 
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={isSaving}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="photoURL">Photo URL</Label>
                    <Input 
                        id="photoURL"
                        value={photoURL}
                        onChange={(e) => setPhotoURL(e.target.value)}
                        placeholder="https://example.com/image.png"
                        disabled={isSaving}
                    />
                    <p className="text-xs text-muted-foreground">For now, please provide a URL for your profile image.</p>
                </div>
                <div className="space-y-2">
                    <Label>Date of Birth</Label>
                     <Popover>
                      <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dob && "text-muted-foreground"
                            )}
                            disabled={isSaving}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dob ? format(dob, "PPP") : <span>Pick a date</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dob}
                          onSelect={setDob}
                          captionLayout="dropdown-buttons"
                          fromYear={1950}
                          toYear={new Date().getFullYear() - 16}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label>PCOS Journey Start Date</Label>
                     <Popover>
                      <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !journeyStartDate && "text-muted-foreground"
                            )}
                             disabled={isSaving}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {journeyStartDate ? format(journeyStartDate, "PPP") : <span>When did your journey begin?</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={journeyStartDate}
                          onSelect={setJourneyStartDate}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                </div>
                 <div className="space-y-2">
                    <Label>Primary Wellness Goal</Label>
                     <Select value={wellnessGoal} onValueChange={setWellnessGoal} disabled={isSaving}>
                        <SelectTrigger>
                            <SelectValue placeholder="What's your main focus?" />
                        </SelectTrigger>
                        <SelectContent>
                            {wellnessGoals.map(goal => (
                                <SelectItem key={goal} value={goal}>{goal}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
             <Button onClick={handleSaveProfile} disabled={isSaving} className="h-12 text-base">
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                Save Changes
            </Button>
        </div>
    )
};


export default function ProfilePage() {
    const router = useRouter();

    return (
        <div className="p-4 md:p-8 space-y-4">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-3xl font-headline font-bold text-gradient flex items-center gap-3">
                        <User className="size-8" />
                        Your Profile
                    </h1>
                </div>
            </header>
            
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>This information helps personalize your experience. Your display name and photo are visible to other members in the community.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfileManagement />
                </CardContent>
            </Card>

        </div>
    );
}
