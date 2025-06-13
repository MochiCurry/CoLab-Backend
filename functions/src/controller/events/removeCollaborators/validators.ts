import * as functions from "firebase-functions";
import { DocumentSnapshot } from "firebase-admin/firestore";
import { eventRef } from "../../helpers/databaseRefs";
import { RemoveCollaboratorsRequest } from "./removeCollaboratorsFromEvent"

export function validateInput(data: RemoveCollaboratorsRequest) {
    if (!data.event_id || !Array.isArray(data.user_ids_to_kick)) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }
}

export async function validateUserIsOwner(userId: string, snapshot: DocumentSnapshot) {
    if (!snapshot.exists) {
        throw new functions.https.HttpsError("not-found", "Event not found.");
    }

    const eventData = snapshot.data();

    if (!eventData || eventData.owner_id !== userId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Only the host can kick collaborators."
        );
    }
}