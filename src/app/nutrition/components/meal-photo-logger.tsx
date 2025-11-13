
'use client';

import { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { m, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { analyzeMealPhoto } from '@/ai/flows/ai-nutrition-scoring';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { AnalysisResult } from '../page';
import { useUser } from '@/firebase';

interface MealPhotoLoggerProps {
    onAnalysisComplete: (result: AnalysisResult) => void;
    onAnalysisStart: () => void;
    onClear: () => void;
    isLoading: boolean;
    mealPhoto: string | null;
    setMealPhoto: (photo: string | null) => void;
}

export const MealPhotoLogger = ({ onAnalysisComplete, onAnalysisStart, onClear, isLoading, mealPhoto, setMealPhoto }: MealPhotoLoggerProps) => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUser();

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

  const analyzePhoto = useCallback(async (dataUrl: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    onAnalysisStart();
    try {
      const result = await analyzeMealPhoto({ userId: user.uid, photoDataUri: dataUrl });
      onAnalysisComplete(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze the meal photo. Please try again.",
      });
      onAnalysisComplete(null);
    }
  }, [onAnalysisStart, onAnalysisComplete, toast, user]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
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
  }, [setMealPhoto, analyzePhoto, toast]);

  const takePicture = useCallback(() => {
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
  }, [setMealPhoto, analyzePhoto]);
  
  const clearPhoto = useCallback(() => {
      setMealPhoto(null);
      onClear();
       if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
  }, [setMealPhoto, onClear]);

  const handleUploadClick = useCallback(() => {
      fileInputRef.current?.click()
  }, []);


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
                  <Button variant="outline" className="animate-biopulse-resting h-12 text-base px-6" onClick={handleUploadClick}>
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
