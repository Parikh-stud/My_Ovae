
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { m, AnimatePresence } from 'framer-motion';
import { BarChart2, Loader2 } from "lucide-react";
import type { AnalysisResult } from '../page';

export const PCOSFriendlyScore = ({ result, onSave, isSaving, hasData }: { result: AnalysisResult; onSave: () => void; isSaving: boolean; hasData: boolean; }) => {
    const score = result?.pcosFriendlyScore ?? 0;
    const confidence = result?.scoreConfidence ?? 0;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle>PCOS-Friendly Score</CardTitle>
                <CardDescription>{hasData ? "Here's how your meal scores." : "Analysis will appear here."}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex flex-col items-center justify-center">
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
                     {hasData && confidence > 0 && (
                        <m.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-center text-sm text-muted-foreground mt-2"
                        >
                            Confidence: ±{confidence} points
                        </m.p>
                    )}
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
