import {NextRequest, NextResponse} from 'next/server';
import {analyzeMealPhoto} from '@/ai/flows/ai-nutrition-scoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const photoDataUri = body?.photoDataUri;

    if (typeof photoDataUri !== 'string' || photoDataUri.length === 0) {
      return NextResponse.json(
        {error: 'photoDataUri must be a non-empty string.'},
        {status: 400}
      );
    }

    const result = await analyzeMealPhoto({photoDataUri});

    return NextResponse.json(result, {status: 200});
  } catch (error) {
    console.error('Failed to analyze meal photo', error);
    return NextResponse.json(
      {error: 'Unable to analyze meal photo at this time.'},
      {status: 500}
    );
  }
}
