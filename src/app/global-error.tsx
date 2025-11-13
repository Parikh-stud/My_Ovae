
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-[450px] glass-card text-center">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-destructive">Something went wrong!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-6">
                        An unexpected error occurred. You can try to refresh the page or click the button below.
                    </p>
                    <Button onClick={() => reset()}>
                        Try again
                    </Button>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-md text-left text-xs text-destructive overflow-auto max-h-60">
                           <pre>
                             <code>{error.stack}</code>
                           </pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </body>
    </html>
  );
}
