
'use client';

import { useState, useCallback } from 'react';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Sparkles } from 'lucide-react';

import { MealPhotoLogger } from './components/meal-photo-logger';
import { ManualMealLogger } from './components/manual-meal-logger';
import { PCOSFriendlyScore } from './components/pcos-friendly-score';
import { AnalysisDetails } from './components/analysis-details';
import type { AnalyzeMealPhotoOutput } from '@/ai/flows/ai-nutrition-scoring';

export type AnalysisResult = AnalyzeMealPhotoOutput | null;


export default function NutritionPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(null);
  const [mealPhoto, setMealPhoto] = useState<string | null>(null);
  const [manualMealDetails, setManualMealDetails] = useState<{mealName: string, foodItems: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAnalysisComplete = useCallback((result: AnalysisResult, mealDetails?: any) => {
    setAnalysisResult(result);
    if (mealDetails) {
        setManualMealDetails(mealDetails);
    }
    setIsLoading(false);
  }, []);
  
  const handleAnalysisStart = useCallback(() => {
      setIsLoading(true);
      setAnalysisResult(null);
      setMealPhoto(null);
      setManualMealDetails(null);
  }, []);
  
  const handleClear = useCallback(() => {
      setAnalysisResult(null);
      setMealPhoto(null);
      setManualMealDetails(null);
      setIsLoading(false);
  }, []);

  const handleSaveLog = useCallback(async () => {
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
  }, [user, firestore, analysisResult, manualMealDetails, mealPhoto, toast, handleClear]);

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
                        <AnalysisDetails result={analysisResult} />
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
                         <AnalysisDetails result={analysisResult} />
                    </aside>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
