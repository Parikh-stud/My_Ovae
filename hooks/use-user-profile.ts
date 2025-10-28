
'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useUser } from '@/firebase';

/**
 * A hook to fetch and provide the full UserProfile document for the currently authenticated user.
 * @returns An object containing the userProfile data and loading state.
 */
export function useUserProfile() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading, error } = useDoc(userProfileRef);

  return { userProfile, isLoading, error };
}
