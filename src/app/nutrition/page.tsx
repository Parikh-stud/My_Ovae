
'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Camera, Upload, BarChart2, Sparkles, X, Loader2, Edit } from "lucide-react";
import { m, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { analyzeMealText } from '@/ai/flows/ai-nutrition-scoring-text';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { addDocumentNonBlocking } from '@/firebase';
import { useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';


type AnalysisResult = {
  pcosFriendlyScore: number;
  dietaryRecommendations: string;
} | null;

const NutritionalBreakdown = ({ result }: { result: AnalysisResult }) => {
    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="text-secondary" /> Dietary Recommendations</CardTitle>
            </CardHeader>
             <CardContent>
                <div className="h-40 flex items-center justify-center text-muted-foreground p-4">
                    {result ? (
                        <p className="text-base text-left">{result.dietaryRecommendations}</p>
                    ) : (
                        <p>Recommendations will appear here.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

const MealPhotoLogger = ({ onAnalysisComplete, onAnalysisStart, onClear, isLoading, mealPhoto, setMealPhoto }: { onAnalysisComplete: (result: any) => void; onAnalysisStart: () => void; onClear: () => void; isLoading: boolean; mealPhoto: string | null; setMealPhoto: (photo: string | null) => void; }) => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);

      } catch (error) {
        setHasCameraPermission(false);
        toast({
            variant: "destructive",
            title: "Camera Access Denied",
            description: "Please enable camera permissions in your browser settings to use this feature.",
        });
      }
    };

    getCameraPermission();
  }, [toast]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload an image smaller than 4MB.",
        });
        return;
      }
      const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!acceptedTypes.includes(file.type)) {
          toast({
              variant: "destructive",
              title: "Invalid File Type",
              description: "Please upload a JPEG, PNG, or WEBP image.",
          });
          return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setMealPhoto(result);
        analyzePhoto(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setMealPhoto(dataUrl);
      analyzePhoto(dataUrl);
    }
  };

  const analyzePhoto = async (dataUrl: string) => {
    onAnalysisStart();
    try {
      const response = await fetch('/api/ai/analyze-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoDataUri: dataUrl }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = (await response.json()) as AnalysisResult;
      onAnalysisComplete(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze the meal photo. Please try again.",
      });
      onAnalysisComplete(null);
    }
  };
  
  const clearPhoto = () => {
      setMealPhoto(null);
      onClear();
       if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
  }


  return (
    <Card className="glass-card lg:col-span-2">
      <CardHeader>
        <CardTitle>AI-Powered Meal Analysis</CardTitle>
        <CardDescription>Snap a photo of your meal for instant insights.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96 border-2 border-dashed border-muted-foreground/50 rounded-xl flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover rounded-md" autoPlay muted playsInline style={{ display: !mealPhoto && hasCameraPermission ? 'block' : 'none' }} />
          <AnimatePresence mode="wait">
            {isLoading ? (
                <m.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center justify-center gap-4"
                >
                    <Loader2 className="size-16 text-primary animate-spin" />
                    <h3 className="font-bold text-lg text-gradient">Analyzing your meal...</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">Our AI is working its magic to give you personalized insights.</p>
                </m.div>
            ) : mealPhoto ? (
              <m.div
                key="preview"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative w-full h-full"
              >
                <Image src={mealPhoto} alt="Meal preview" fill={true} style={{objectFit:"contain"}} className="rounded-md" />
                 <Button variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full z-10" onClick={clearPhoto}>
                    <X className="size-4" />
                </Button>
              </m.div>
            ) : (
              <m.div
                key="prompt"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center justify-center gap-4 w-full h-full"
              >
                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80">
                        <Alert variant="destructive" className="w-auto">
                            <AlertTitle>Camera Access Required</AlertTitle>
                            <AlertDescription>
                                Please allow camera access to use this feature.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                <div className="absolute bottom-8 flex gap-4 mt-4">
                  <Button className="animate-biopulse-resting h-12 text-base px-6" onClick={takePicture} disabled={!hasCameraPermission}>
                    <Camera className="mr-2" /> Take Photo
                  </Button>
                  <Button variant="outline" className="animate-biopulse-resting h-12 text-base px-6" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2" /> Upload
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};

const PCOSFriendlyScore = ({ result, onSave, isSaving, hasData }: { result: AnalysisResult; onSave: () => void; isSaving: boolean; hasData: boolean; }) => {
    const score = result?.pcosFriendlyScore ?? 0;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle>PCOS-Friendly Score</CardTitle>
                <CardDescription>{hasData ? "Here's how your meal scores." : "Analysis will appear here."}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {!hasData ? (
                             <m.div
                                key="waiting"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center text-muted-foreground"
                            >
                                <BarChart2 className="size-12 mx-auto mb-2"/>
                                <p>Waiting for meal...</p>
                            </m.div>
                        ) : (
                            <m.div
                                key="score"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="relative size-40 flex items-center justify-center"
                            >
                                <svg className="absolute size-full transform -rotate-90">
                                    <circle className="text-muted/50" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50%" cy="50%" />
                                    <m.circle
                                        className="text-primary"
                                        strokeWidth="10"
                                        strokeDasharray={circumference}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="45"
                                        cx="50%"
                                        cy="50%"
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset: offset }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                    />
                                </svg>
                                <div className="text-center">
                                    <m.span 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-4xl font-bold font-code text-white"
                                    >
                                     {score}
                                    </m.span>
                                    <p className="text-xs text-muted-foreground">PCOS-Friendly</p>
                                </div>
                             </m.div>
                        )}
                    </AnimatePresence>
                </div>
                 {hasData && (
                    <Button className="w-full" onClick={onSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : "Save Log to Journal"}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

const ManualMealLogger = ({ onAnalysisComplete, onAnalysisStart, onClear, isLoading }: { onAnalysisComplete: (result: any, mealDetails: any) => void; onAnalysisStart: () => void; onClear: () => void; isLoading: boolean; }) => {
    const [mealName, setMealName] = useState('');
    const [foodItems, setFoodItems] = useState('');
    const { toast } = useToast();

    const handleManualAnalysis = async () => {
        if (!mealName || !foodItems) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please select a meal and list the food items.'
            });
            return;
        }
        onAnalysisStart();
        try {
            const result = await analyzeMealText({ mealDescription: foodItems });
            onAnalysisComplete(result, { mealName, foodItems });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Analysis Failed",
                description: "Could not analyze the meal description. Please try again."
            });
            onAnalysisComplete(null, {});
        }
    }
    
    return (
        <Card className="glass-card lg:col-span-2">
            <CardHeader>
                <CardTitle>Manual Meal Log</CardTitle>
                <CardDescription>Describe your meal to get AI-powered insights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="meal-type">Meal Type</Label>
                    <Select value={mealName} onValueChange={setMealName}>
                        <SelectTrigger id="meal-type">
                            <SelectValue placeholder="Select a meal" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Breakfast">Breakfast</SelectItem>
                            <SelectItem value="Lunch">Lunch</SelectItem>
                            <SelectItem value="Dinner">Dinner</SelectItem>
                            <SelectItem value="Snack">Snack</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="food-items">Food Items</Label>
                    <Textarea 
                        id="food-items"
                        placeholder="e.g., Grilled chicken breast, quinoa, steamed broccoli..."
                        value={foodItems}
                        onChange={(e) => setFoodItems(e.target.value)}
                        className="h-32 bg-background/50"
                        disabled={isLoading}
                    />
                </div>
                <Button className="w-full h-12 text-base" onClick={handleManualAnalysis} disabled={isLoading || !mealName || !foodItems}>
                    {isLoading ? <Loader2 className="animate-spin" /> : "Analyze Meal"}
                </Button>
            </CardContent>
        </Card>
    );
};


export default function NutritionPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(null);
  const [mealPhoto, setMealPhoto] = useState<string | null>(null);
  const [manualMealDetails, setManualMealDetails] = useState<{mealName: string, foodItems: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAnalysisComplete = (result: AnalysisResult, mealDetails?: any) => {
    setAnalysisResult(result);
    if (mealDetails) {
        setManualMealDetails(mealDetails);
    }
    setIsLoading(false);
  };
  
  const handleAnalysisStart = () => {
      setIsLoading(true);
      setAnalysisResult(null);
      setMealPhoto(null);
      setManualMealDetails(null);
  }
  
  const handleClear = () => {
      setAnalysisResult(null);
      setMealPhoto(null);
      setManualMealDetails(null);
      setIsLoading(false);
  }

  const handleSaveLog = async () => {
      if (!user || !firestore || !analysisResult) {
          toast({
              variant: "destructive",
              title: "Cannot Save",
              description: "User not logged in or no analysis result available."
          });
          return;
      }
      setIsSaving(true);

      const logData = {
          userId: user.uid,
          mealName: manualMealDetails?.mealName || "AI Analyzed Meal",
          foodItems: manualMealDetails?.foodItems || analysisResult.dietaryRecommendations,
          loggedAt: new Date(),
          photoURL: mealPhoto,
          pcosScore: analysisResult.pcosFriendlyScore,
      };

      try {
        const collectionRef = collection(firestore, 'users', user.uid, 'nutritionLogs');
        await addDocumentNonBlocking(collectionRef, logData);

        toast({
            title: "Meal Logged!",
            description: "Your nutritional analysis has been saved to your journal."
        });
        handleClear();

      } catch (error) {
          toast({
              variant: "destructive",
              title: "Save Failed",
              description: "Could not save your meal log. Please try again."
          });
      } finally {
        setIsSaving(false);
      }
  }

  return (
    <div className="p-4 md:p-8 space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-bold text-gradient">Nutrition Hub</h1>
      </header>

        <Tabs defaultValue="ai-snap" className="w-full" onValueChange={handleClear}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai-snap"><Sparkles className="mr-2" />AI Meal Snap</TabsTrigger>
                <TabsTrigger value="manual"><Edit className="mr-2" />Manual Log</TabsTrigger>
            </TabsList>
            <TabsContent value="ai-snap">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                    <MealPhotoLogger 
                        onAnalysisComplete={handleAnalysisComplete} 
                        onAnalysisStart={handleAnalysisStart} 
                        onClear={handleClear} 
                        isLoading={isLoading}
                        mealPhoto={mealPhoto}
                        setMealPhoto={setMealPhoto}
                    />
                    <aside className="space-y-6">
                        <PCOSFriendlyScore result={analysisResult} onSave={handleSaveLog} isSaving={isSaving} hasData={!!mealPhoto} />
                        <NutritionalBreakdown result={analysisResult} />
                    </aside>
                </div>
            </TabsContent>
            <TabsContent value="manual">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                    <ManualMealLogger 
                        onAnalysisComplete={handleAnalysisComplete}
                        onAnalysisStart={handleAnalysisStart}
                        onClear={handleClear}
                        isLoading={isLoading}
                    />
                     <aside className="space-y-6">
                         <PCOSFriendlyScore result={analysisResult} onSave={handleSaveLog} isSaving={isSaving} hasData={!!manualMealDetails} />
                         <NutritionalBreakdown result={analysisResult} />
                    </aside>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
