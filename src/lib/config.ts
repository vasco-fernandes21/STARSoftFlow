// Define allowed MIME types as string literals
export type ProfileMimeType = 'image/jpeg' | 'image/png' | 'image/gif';
export type DeliverableMimeType = 
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'image/jpeg'
  | 'image/png'
  | 'application/zip';
export type FeedbackMimeType = ProfileMimeType;

// Blob Storage Configuration
export const BLOB_CONFIG = {
  // Base URL for the blob storage
  STORE_URL: "https://kd6uxjvo8hyw1ahh.public.blob.vercel-storage.com",
  
  // Path prefixes for different types of uploads
  PATHS: {
    PROFILE_PHOTOS: 'fotos-perfil',
    DELIVERABLE_FILES: 'anexos-entregaveis',
    FEEDBACK_IMAGES: 'feedbacks',
  },

  // Maximum file sizes in bytes
  MAX_SIZES: {
    PROFILE_PHOTO: 5 * 1024 * 1024, // 5MB
    DELIVERABLE: 50 * 1024 * 1024, // 50MB
    FEEDBACK_ATTACHMENT: 10 * 1024 * 1024, // 10MB
  },

  // Allowed file types for different upload categories
  ALLOWED_TYPES: {
    PROFILE: ['image/jpeg', 'image/png', 'image/gif'] as ProfileMimeType[],
    DELIVERABLE: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'application/zip'
    ] as DeliverableMimeType[],
    FEEDBACK_ATTACHMENT: ['image/jpeg', 'image/png', 'image/gif'] as FeedbackMimeType[],
  },

  // Helper function to construct full blob URLs
  getUrl: (path: string) => `${BLOB_CONFIG.STORE_URL}/${path}`,
} as const; 