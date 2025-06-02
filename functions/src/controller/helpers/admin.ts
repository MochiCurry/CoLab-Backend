import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Firebase services
const db = admin.firestore();
const bucket = admin.storage().bucket();
const auth = admin.auth();

// Export the services so they can be used in other files
export { db, bucket, auth, admin };