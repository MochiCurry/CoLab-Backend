import * as functions from "firebase-functions";
import { admin } from '../helpers/admin';

export const sendFriendRequest = functions.https.onCall(
  async (request, context) => {
    const { senderId, receiverId } = request.data;
    
    if (!senderId || !receiverId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing user IDs.");
    }
    if (senderId === receiverId) {
      throw new functions.https.HttpsError("failed-precondition", "You cannot friend yourself.");
    }

    const db = admin.firestore();
    const senderRef = db.collection("users").doc(senderId);
    const receiverRef = db.collection("users").doc(receiverId);
    
    const senderRequestRef = senderRef.collection("ownRequests").doc(receiverId);
    const receiverRequestRef = receiverRef.collection("friendRequests").doc(senderId);

    return db.runTransaction(async (transaction) => {
      const existingRequest = await transaction.get(receiverRequestRef);

      if (existingRequest.exists) {
        // Both users have requested each other → Automatically become friends
        const senderFriendsRef = senderRef.collection("friends").doc(receiverId);
        const receiverFriendsRef = receiverRef.collection("friends").doc(senderId);

        transaction.set(senderFriendsRef, { friendUserId: receiverId, since: admin.firestore.FieldValue.serverTimestamp() });
        transaction.set(receiverFriendsRef, { friendUserId: senderId, since: admin.firestore.FieldValue.serverTimestamp() });

        // Remove pending friend requests
        transaction.delete(receiverRequestRef);
        transaction.delete(senderRequestRef);

        return { success: true, message: "Friend request automatically accepted!" };
      }

      // Store friend request in both sender's and receiver's collections
      transaction.set(receiverRequestRef, {
        senderId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.set(senderRequestRef, {
        receiverId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: "Friend request sent." };
    });
  }
);