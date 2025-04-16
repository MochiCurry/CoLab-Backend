import * as functions from "firebase-functions";
import { admin } from '../helpers/admin';

export const acceptFriendRequest = functions.https.onCall(
    async (request, context) => {
      const { userId, senderId } = request.data;
  
      if (!userId || !senderId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing user IDs.");
      }
  
      const db = admin.firestore();
      const userRef = db.collection("users").doc(userId);
      const senderRef = db.collection("users").doc(senderId);
  
      const userFriendsRef = userRef.collection("friends").doc(senderId);
      const senderFriendsRef = senderRef.collection("friends").doc(userId);
  
      const requestRef = userRef.collection("friendRequests").doc(senderId);
      const senderOwnRequestRef = senderRef.collection("ownRequests").doc(userId); // FIXED!
  
      return db.runTransaction(async (transaction) => {
        const requestSnapshot = await transaction.get(requestRef);
  
        if (!requestSnapshot.exists) {
          throw new functions.https.HttpsError("not-found", "Friend request does not exist.");
        }
  
        // Add each user to the other's friend list
        transaction.set(userFriendsRef, { friendUserId: senderId, since: admin.firestore.FieldValue.serverTimestamp() });
        transaction.set(senderFriendsRef, { friendUserId: userId, since: admin.firestore.FieldValue.serverTimestamp() });
  
        // Remove the friend request (from receiver's friendRequests and sender's ownRequests)
        transaction.delete(requestRef);
        transaction.delete(senderOwnRequestRef); // ✅ FIXED: Removes from sender's ownRequests
  
        return { success: true, message: "Friend request accepted successfully!" };
      });
    }
  );
  