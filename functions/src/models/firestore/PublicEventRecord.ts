import { admin } from "@/controller/helpers/admin";
import { HostModel, FirestoreEventTimeRange, Visibility } from "@/models/firestore/EventRecord";
import { CollaboratorRole, CollaboratorStatus } from "@/models/runtime/CollaboratorModel";

export type PublicEventRecord = {
    id: string; // event ID
    visibility: string,
    title: string;
    description: string;
    categories: string[];
    host: HostModel;
    banner?: string;
    date?: FirestoreEventTimeRange;
    effective_date: admin.firestore.Timestamp;
    date_source: string;
    created_at: admin.firestore.FieldValue | admin.firestore.Timestamp;
  };