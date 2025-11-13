'use server';

import { adminAuth, adminFirestore } from '@/lib/firebase-admin';

type DeleteAccountInput = {
  idToken: string;
};

type DeleteAccountResult = {
  uid: string;
};

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return 'Unknown error';
}

export async function deleteAccountData({ idToken }: DeleteAccountInput): Promise<DeleteAccountResult> {
  if (!idToken) {
    throw new Error('An ID token is required to delete account data.');
  }

  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const { uid } = decodedToken;

  const userDocument = adminFirestore.collection('users').doc(uid);
  const publicProfileDocument = adminFirestore.collection('publicUserProfiles').doc(uid);

  const deletionResults = await Promise.allSettled([
    adminFirestore.recursiveDelete(userDocument),
    adminFirestore.recursiveDelete(publicProfileDocument),
  ]);

  const failures = deletionResults
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => extractErrorMessage(result.reason));

  if (failures.length > 0) {
    throw new Error(`Failed to remove all user data: ${failures.join('; ')}`);
  }

  return { uid };
}
