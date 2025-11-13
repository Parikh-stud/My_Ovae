
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle, Sparkles, Info, ArrowRight, TrendingDown, Shield, Wind } from "lucide-react";
import type { AnalysisResult } from '../page';

const verdictIcons = {
    "Good": <CheckCircle className="text-green-500" />,
    "Okay": <AlertCircle className="text-yellow-500" />,
    "Avoid": <XCircle className="text-red-500" />,
};

const MacroDisplay = ({ label, value, total, color }: { label: string, value: number, total: number, color:string }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-sm text-muted-foreground">{value}g</p>
            </div>
            <Progress value={percentage} className={cn("h-2", color)} />
        </div>
    )
};

const SubScoreDisplay = ({ icon, label, score, color } : { icon: React.ReactNode, label: string, score: number, color: string }) => (
    <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-full bg-black/20", color)}>
            {icon}
        </div>
        <div className="flex-1">
            <p className="font-semibold">{label}</p>
            <Progress value={score} className={cn("h-2 mt-1", color)} />
        </div>
        <p className={cn("font-bold text-lg", color)}>{score}</p>
    </div>
);


export const AnalysisDetails = ({ result }: { result: AnalysisResult }) => {
    if (!result) {
        return (
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-secondary" /> Analysis Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground p-4">
                        <p>Analysis details will appear here once a meal is logged.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    const { proteinGrams, carbGrams, fatGrams, fiberGrams, sugarGrams, ingredientAnalysis, dietaryRecommendations, subScores, micronutrientAnalysis } = result;
    const totalMacros = proteinGrams + carbGrams + fatGrams;

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="text-secondary" /> Analysis Details</CardTitle>
                <CardDescription>A breakdown of your meal's components.</CardDescription>
            </CardHeader>
             <CardContent className="space-y-6">
                 {subScores && (
                    <div>
                        <h4 className="font-semibold mb-3">Score Breakdown</h4>
                        <div className="space-y-4">
                            <SubScoreDisplay icon={<TrendingDown size={20} />} label="Glycemic Impact" score={subScores.glycemicImpact} color="text-chart-3" />
                            <SubScoreDisplay icon={<Shield size={20} />} label="Inflammation Score" score={subScores.inflammationScore} color="text-chart-4" />
                            <SubScoreDisplay icon={<Wind size={20} />} label="Hormone Balance" score={subScores.hormoneBalance} color="text-chart-2" />
                        </div>
                    </div>
                 )}
                <div>
                    <h4 className="font-semibold mb-2">Macro Estimates</h4>
                    <div className="space-y-3">
                       <MacroDisplay label="Protein" value={proteinGrams} total={totalMacros} color="bg-chart-2" />
                       <MacroDisplay label="Carbohydrates" value={carbGrams} total={totalMacros} color="bg-chart-3" />
                       <MacroDisplay label="Fats" value={fatGrams} total={totalMacros} color="bg-chart-4" />
                       <MacroDisplay label="Fiber" value={fiberGrams} total={carbGrams} color="bg-chart-1" />
                       <MacroDisplay label="Sugar" value={sugarGrams} total={carbGrams} color="bg-destructive" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><Info className="size-3" />Estimates are based on typical portions.</p>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2">Ingredient Analysis</h4>
                    <div className="space-y-2">
                        {ingredientAnalysis.map((item, index) => (
                             <div key={index} className="p-3 bg-black/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium">{item.name}</p>
                                    <Badge variant="outline" className="flex items-center gap-1">
                                        {verdictIcons[item.verdict]}
                                        {item.verdict}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                                {item.verdict === 'Avoid' && item.suggestedSwap && (
                                    <div className="text-xs text-green-400 mt-2 flex items-center gap-2 font-semibold bg-green-900/30 p-2 rounded-md">
                                        Swap Idea: <ArrowRight className="size-3" /> {item.suggestedSwap}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                 {micronutrientAnalysis && (
                    <div>
                        <h4 className="font-semibold mb-2">Micronutrient Note</h4>
                        <p className="text-sm text-muted-foreground italic">"{micronutrientAnalysis}"</p>
                    </div>
                 )}
                <div>
                    <h4 className="font-semibold mb-2">Dietitian's Note</h4>
                    <p className="text-sm text-muted-foreground italic">"{dietaryRecommendations}"</p>
                </div>
            </CardContent>
        </Card>
    )
}
