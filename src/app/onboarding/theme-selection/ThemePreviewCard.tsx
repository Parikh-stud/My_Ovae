
'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const ThemePreviewCard = ({ theme, isSelected, onSelect, mounted }: { theme: any, isSelected: boolean, onSelect: (id: string) => void, mounted: boolean }) => {
    
    if (!mounted) {
        return <Skeleton className="h-[220px] w-full rounded-2xl" />;
    }
    
    return (
        <m.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            onClick={() => onSelect(theme.id)}
            className={cn(
                "cursor-pointer rounded-2xl p-6 transition-all duration-300 glass-card-auth",
                isSelected ? 'ring-2 ring-primary ring-offset-4 ring-offset-background' : 'ring-2 ring-transparent'
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{theme.name}</h3>
                {isSelected && (
                    <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="size-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="size-4 text-primary-foreground" />
                    </m.div>
                )}
            </div>

            <div className={`rounded-lg p-4 h-32 flex flex-col justify-between ${theme.id}`}>
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="w-24 h-3 rounded-full bg-card-foreground/30"></div>
                        <div className="w-16 h-3 rounded-full bg-card-foreground/20"></div>
                    </div>
                    <div className="size-8 rounded-full bg-card-foreground/20"></div>
                </div>

                <div className="flex justify-end">
                     <div className="w-20 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                        Button
                     </div>
                </div>
            </div>
        </m.div>
    );
};
