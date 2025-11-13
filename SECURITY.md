# Security Policy

## Supported Versions

We aim to ship security fixes to all currently deployed environments. When a branch becomes unsupported it will be documented here.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

Email security@myovae.app with a detailed description of the vulnerability, reproduction steps, and any suggested mitigation. We acknowledge reports within two business days and provide status updates weekly until resolution.

## Account Deletion Data Handling

Users can now permanently delete their account data from the **Settings → Privacy & Security → Delete Account** flow. The deletion button triggers a secure Next.js server action that:

1. Verifies the caller's Firebase ID token with the Admin SDK to ensure the request is made by the authenticated user.
2. Uses the Admin Firestore API's `recursiveDelete` helper to purge `users/{uid}` (including subcollections such as `symptomLogs`, `nutritionLogs`, `fitnessActivities`, `cycles`, and `labResults`).
3. Recursively removes the matching `publicUserProfiles/{uid}` document and any nested documents.
4. Returns control to the client component which subsequently deletes the Firebase Auth user record. The client only attempts the Auth deletion once Firestore cleanup succeeds, preventing orphaned data.

Admin credentials must be provided through `FIREBASE_ADMIN_CREDENTIALS` or the `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` environment variables so the server action can authenticate securely.

## Regression Coverage – Account Deletion Checklist

Perform the following steps prior to each release to confirm the purge flow removes user data:

1. **Create a test user** and authenticate through the web UI.
2. **Seed sample data** across user-owned collections (e.g., add entries to symptom, nutrition, fitness, cycle, and lab result logs).
3. **Initiate the deletion** via Settings and wait for the success toast.
4. **Verify Firestore cleanup** in the Firebase console or via the Admin SDK to confirm that `users/{uid}` and `publicUserProfiles/{uid}` and all subcollections are absent.
5. **Confirm authentication removal** by ensuring the test user can no longer sign in and their Auth record has been removed.
