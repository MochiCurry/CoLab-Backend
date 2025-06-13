export type CollaboratorModel = {
    user_id: string;
    username: string;
    profile_image_url?: string | null;
    role: CollaboratorRole;
    status: CollaboratorStatus;
  }
  
  export type BasicUserData = {
    user_id: string;
    username: string;
    profile_image_url?: string;
  }

  export type CollaboratorRole = "host" | "member";
  export type CollaboratorStatus = "active" | "pending" | "declined";