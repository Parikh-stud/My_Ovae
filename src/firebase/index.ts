
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED, memoryLocalCache } from 'firebase/firestore'
import { 
    setDocumentNonBlocking,
    addDocumentNonBlocking,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking
} from './firestore/non-blocking';


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    const app = getApp();
    return {
        firebaseApp: app,
        auth: getAuth(app),
        firestore: getFirestore(app)
    };
  }
  
  const firebaseApp = initializeApp(firebaseConfig);
  
  // Initialize Firestore with in-memory caching for performance
  const firestore = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache()
  });

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore
  };
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
export { 
    setDocumentNonBlocking,
    addDocumentNonBlocking,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking
};
