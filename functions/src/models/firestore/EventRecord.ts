import { admin } from "@/controller/helpers/admin";
import { CollaboratorRole, CollaboratorStatus } from "@/models/runtime/CollaboratorModel";

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
    created_at: admin.firestore.FieldValue | admin.firestore.Timestamp;
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