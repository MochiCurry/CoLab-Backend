import * as functions from 'firebase-functions';
import { admin } from '../helpers/admin';

export const leaveEvent = functions.https.onCall(async (request) => {
  const data = request.data;
  const context = request.auth;

  const eventId = data.event_id;
  const userId = data.user_id;

  // Check if the user is authenticated
  if (!context) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if the eventId and userId are provided
  if (!eventId || !userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing eventId or userId');
  }

  // Reference to the event document
  const eventRef = admin.firestore().collection('events').doc(eventId);

  try {
    // Remove the user from the collaborators subcollection
    const collaboratorRef = eventRef.collection('collaborators').doc(userId);
    await collaboratorRef.delete();

    // Optionally, update the user's collaborations (if you're storing them)
    const userCollaborationRef = admin.firestore().collection('users').doc(userId)
      .collection('collaborations').doc(eventId);
    await userCollaborationRef.delete();

    // Log the removal of the user
    console.log(`User ${userId} successfully left event ${eventId}`);

    return { success: true, message: 'User left the event successfully' };
  } catch (error) {
    console.error('Error removing user from event:', error);
    throw new functions.https.HttpsError('internal', 'Error leaving event');
  }
});
