
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
export const firebaseConfig = {
  "projectId": "studio-7508996706-6b44f",
  "appId": "1:156165104185:web:f2fd432b85d51c56aae3e8",
  "apiKey": "AIzaSyDSfpAxSkehw9AmvxzFCYxvLCAnHaORAzw",
  "authDomain": "studio-7508996706-6b44f.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "156165104185"
};

// This is a server-side only initialization.
// The client-side initialization is in src/firebase/index.ts
export function initializeFirebase(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}
