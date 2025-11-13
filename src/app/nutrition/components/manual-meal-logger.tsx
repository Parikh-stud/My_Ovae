
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { analyzeMealPhoto } from '@/ai/flows/ai-nutrition-scoring';
import type { AnalysisResult } from '../page';
import { useUser } from '@/firebase';

interface ManualMealLoggerProps {
    onAnalysisComplete: (result: AnalysisResult, mealDetails: any) => void;
    onAnalysisStart: () => void;
    onClear: () => void;
    isLoading: boolean;
}

export const ManualMealLogger = ({ onAnalysisComplete, onAnalysisStart, isLoading }: ManualMealLoggerProps) => {
    const [mealName, setMealName] = useState('');
    const [foodItems, setFoodItems] = useState('');
    const { toast } = useToast();
    const { user } = useUser();

    const handleManualAnalysis = useCallback(async () => {
        if (!mealName || !foodItems) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please select a meal and list the food items.'
            });
            return;
        }
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }
        onAnalysisStart();
        try {
            // The multimodal model can analyze text even with a placeholder image.
            // We pass the description in the prompt, now with added context.
            const analysisPrompt = `Analyze the following ${mealName} meal: ${foodItems}`;
            
            const result = await analyzeMealPhoto({ 
                userId: user.uid,
                prompt: analysisPrompt,
                photoDataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            });
            onAnalysisComplete(result, { mealName, foodItems });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Analysis Failed",
                description: "Could not analyze the meal description. Please try again."
            });
            onAnalysisComplete(null, {});
        }
    }, [mealName, foodItems, onAnalysisStart, onAnalysisComplete, toast, user]);

    const handleFoodItemsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFoodItems(e.target.value);
    }, []);

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
                        onChange={handleFoodItemsChange}
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
