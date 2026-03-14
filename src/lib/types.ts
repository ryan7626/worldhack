export interface PhotoMetadata {
  id: string;
  filename: string;
  originalName: string;
  dateTaken: string | null; // ISO date string
  description: string;
  tags: string[];
  width?: number;
  height?: number;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  camera?: {
    make?: string;
    model?: string;
  };
  uploadedAt: string;
  path?: string; // Local path (legacy)
  url: string;   // Public Supabase Storage URL
}

export interface PhotoStore {
  photos: PhotoMetadata[];
}

export interface MarbleWorld {
  id: string;
  displayName: string;
  worldMarbleUrl: string;
  status: "generating" | "completed" | "failed";
  operationId?: string;
  thumbnailUrl?: string;
  panoramaUrl?: string;
  caption?: string;
  sourcePhotoId: string;
  createdAt: string;
}

export interface WorldGenerationRequest {
  photoId: string;
  photoUrl: string;
  displayName: string;
}

export interface WorldGenerationResponse {
  operationId: string;
  worldId?: string;
}

export interface MarbleOperationResponse {
  done: boolean;
  response?: {
    id: string;
    display_name: string;
    world_marble_url: string;
    assets?: {
      imagery?: { pano_url?: string };
      thumbnail_url?: string;
      caption?: string;
    };
  };
}

export interface ConnectionDetails {
  serverUrl: string;
  roomName: string;
  participantToken: string;
  participantName: string;
}
