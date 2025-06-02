import * as functions from "firebase-functions";
import { admin } from '../helpers/admin';

export const cancelFriendRequest = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ userId: string; receiverId: string }>, context) => {
    const { userId, receiverId } = request.data;

    if (!userId || !receiverId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing user IDs.");
    }

    console.log(`Canceling friend request from ${userId} to ${receiverId}`);

    const db = admin.firestore();
    const senderRef = db.collection("users").doc(userId);
    const receiverRef = db.collection("users").doc(receiverId);

    const ownRequestRef = senderRef.collection("ownRequests").doc(receiverId);
    const receiverRequestRef = receiverRef.collection("friendRequests").doc(userId);

    return db.runTransaction(async (transaction) => {
      console.log(`Checking if request exists: ${ownRequestRef.path}`);

      const ownRequestSnapshot = await transaction.get(ownRequestRef);

      if (!ownRequestSnapshot.exists) {
        console.log("Friend request does not exist, aborting.");
        throw new functions.https.HttpsError("not-found", "Friend request does not exist.");
      }

      // Delete the friend request from both sender's and receiver's collections
      console.log(`Deleting friend request from ${receiverRequestRef.path}`);
      transaction.delete(receiverRequestRef);

      console.log(`Deleting own request from ${ownRequestRef.path}`);
      transaction.delete(ownRequestRef);

      console.log("Transaction complete.");
      return { success: true, message: "Friend request canceled successfully!" };
    });
  }
);