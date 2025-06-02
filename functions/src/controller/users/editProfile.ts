import { admin, db } from '../helpers/admin';
import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";

// --- Helpers ---
const getUserRef = (uid: string) => db.collection("users").doc(uid);
const getUsernameRef = (username: string) => db.collection("usernames").doc(username.toLowerCase());

async function ensureUsernameIsAvailable(tx: admin.firestore.Transaction, newUsername: string) {
	const usernameRef = getUsernameRef(newUsername);
	const usernameSnap = await tx.get(usernameRef);
	if (usernameSnap.exists) {
		throw new HttpsError("already-exists", "That username is already taken.");
	}
	return usernameRef;
}

function buildProfileImageData(profile_image: any) {
	if (!profile_image) return undefined;

	const { image_path, thumbnail_url } = profile_image;
	return {
		image_path: image_path || null,
		thumbnail_url: thumbnail_url || null,
	};
}

// --- Main Function ---
export const editUserProfile = onCall(async (request) => {
	const uid = request.auth?.uid;
	if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");

	const { username, bio, profile_image } = request.data;
	const userRef = getUserRef(uid);

	await db.runTransaction(async (tx) => {
		const userSnap = await tx.get(userRef);
		if (!userSnap.exists) {
			throw new HttpsError("not-found", "User document not found.");
		}

		const currentData = userSnap.data();
		const currentUsername = currentData?.username;
		const updateData: any = {};

		// ✅ Username logic
		if (username && username !== currentUsername) {
			const newUsernameRef = await ensureUsernameIsAvailable(tx, username);
			const oldUsernameRef = currentUsername ? getUsernameRef(currentUsername) : null;

			tx.set(newUsernameRef, { uid, createdAt: new Date() });
			if (oldUsernameRef) tx.delete(oldUsernameRef);

			updateData.username = username.toLowerCase();
		}

		// ✅ Optional fields
		if (bio !== undefined) updateData.bio = bio;
		const imageData = buildProfileImageData(profile_image);
		if (imageData) updateData.profile_image = imageData;

		tx.update(userRef, updateData);
	});

	return { success: true };
});
