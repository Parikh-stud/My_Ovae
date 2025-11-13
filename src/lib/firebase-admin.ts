import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin';

const globalForAdmin = globalThis as typeof globalThis & {
  firebaseAdminApp?: App;
  firebaseAdminAuth?: Auth;
  firebaseAdminDb?: Firestore;
};

function getServiceAccount(): ServiceAccount | undefined {
  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    try {
      return JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS) as ServiceAccount;
    } catch (error) {
      throw new Error('Invalid FIREBASE_ADMIN_CREDENTIALS JSON.');
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey } satisfies ServiceAccount;
  }

  return undefined;
}

function initializeFirebaseAdmin(): { app: App; auth: Auth; db: Firestore } {
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin SDK must not be initialized in the browser.');
  }

  if (!globalForAdmin.firebaseAdminApp) {
    const serviceAccount = getServiceAccount();

    if (!serviceAccount) {
      throw new Error(
        'Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_CREDENTIALS or the individual service account env vars.'
      );
    }

    const app = initializeApp({
      credential: cert(serviceAccount),
    });

    globalForAdmin.firebaseAdminApp = app;
    globalForAdmin.firebaseAdminAuth = getAuth(app);
    globalForAdmin.firebaseAdminDb = getFirestore(app);
  }

  return {
    app: globalForAdmin.firebaseAdminApp!,
    auth: globalForAdmin.firebaseAdminAuth!,
    db: globalForAdmin.firebaseAdminDb!,
  };
}

const { auth: adminAuth, db: adminFirestore } = initializeFirebaseAdmin();

export { adminAuth, adminFirestore };
