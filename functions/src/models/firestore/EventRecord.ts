import { admin } from "@/controller/helpers/admin";
import { CollaboratorRole, CollaboratorStatus } from "@/models/runtime/CollaboratorModel";

/** Controls who can see and join an event */
/**
 * - private → Only collaborators / invited users can see the event.
 * - public → Discoverable in the public feed, join policy enforced.
 * - unlisted → Not in discovery, but anyone with a direct link can see/join.
 */
export type Visibility = "private" | "public" | "unlisted";

export type EventRecord = {
    id: string;
    title: string;
    description: string;
    owner_id: string;
    host: HostModel;
    location: string | null;
    categories: string[];
    required_items: string[];
    optional_items: string[];
    date?: FirestoreEventTimeRange;
    effective_date: admin.firestore.Timestamp;
    date_source: string;
    visibility: Visibility;
    created_at: admin.firestore.FieldValue | admin.firestore.Timestamp;

    media?: EventMedia | null;
  };

  export type EventCollaboratorRecord = {
    user_id: string;
    username: string;
    profile_image_url?: string | null;
    role: CollaboratorRole;
    status: CollaboratorStatus; // adjust per your app
    joined_at: admin.firestore.FieldValue | admin.firestore.Timestamp;
  };

  export type UserCollaborationRecord = {
    id: string; // event ID
    title: string;
    description: string;
    categories: string[];
    host: HostModel;
    role: CollaboratorRole;
    date?: FirestoreEventTimeRange;
    effective_date: admin.firestore.Timestamp;
    date_source: string;
    joined_at: admin.firestore.FieldValue | admin.firestore.Timestamp;
    created_at: admin.firestore.FieldValue | admin.firestore.Timestamp;
  };

  export type HostModel = {
    id: string;                         // Firestore user ID
    username: string;
    profile_image_url?: string | null; // optional, allow null fallback
  };
  
  export type FirestoreEventTimeRange = {
    start: admin.firestore.Timestamp;
    end?: admin.firestore.Timestamp;
  }

  export type EventMedia = {
    // public/downloadable URL for a small image used by UI/Algolia
    thumbnail?: {
      url?: string | null;
      width?: number;
      height?: number;
    } | null;
    // optional storage path to the original/banner (not used by Algolia)
    banner?: string | null;
  };