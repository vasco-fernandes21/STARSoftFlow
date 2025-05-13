import { put, del, list } from '@vercel/blob';
import { upload } from '@vercel/blob/client';
import type { PutBlobResult, ListBlobResult } from '@vercel/blob';
import { BLOB_CONFIG, type ProfileMimeType, type DeliverableMimeType, type FeedbackMimeType } from './config';

export const ALLOWED_FILE_TYPES = BLOB_CONFIG.ALLOWED_TYPES;
export const BLOB_PATHS = BLOB_CONFIG.PATHS;
export const MAX_FILE_SIZES = BLOB_CONFIG.MAX_SIZES;

// Helper function to validate MIME type
function isFeedbackMimeType(type: string): type is FeedbackMimeType {
  return ALLOWED_FILE_TYPES.FEEDBACK_ATTACHMENT.includes(type as FeedbackMimeType);
}

function isProfileMimeType(type: string): type is ProfileMimeType {
  return ALLOWED_FILE_TYPES.PROFILE.includes(type as ProfileMimeType);
}

function isDeliverableMimeType(type: string): type is DeliverableMimeType {
  return ALLOWED_FILE_TYPES.DELIVERABLE.includes(type as DeliverableMimeType);
}

// Client-side upload helper for feedback attachments
export async function uploadFeedbackAttachmentClient(
  file: File,
  feedbackId: string,
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
): Promise<PutBlobResult> {
  if (!isFeedbackMimeType(file.type)) {
    throw new Error('Tipo de ficheiro inválido para o anexo do feedback');
  }

  if (file.size > MAX_FILE_SIZES.FEEDBACK_ATTACHMENT) {
    throw new Error('Ficheiro excede o tamanho máximo permitido (10MB)');
  }

  const pathname = `${BLOB_PATHS.FEEDBACK_IMAGES}/${feedbackId}`;
  
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    onUploadProgress: onProgress,
  });

  return blob;
}

// Server-side upload for feedback attachments
export async function uploadFeedbackAttachment(
  fileBuffer: Buffer,
  contentType: string,
  feedbackId: string,
): Promise<PutBlobResult> {
  if (!isFeedbackMimeType(contentType)) {
    throw new Error('Tipo de ficheiro inválido para o anexo do feedback');
  }

  const pathname = `${BLOB_PATHS.FEEDBACK_IMAGES}/${feedbackId}`;
  const blob = await put(pathname, fileBuffer, {
    access: 'public',
    contentType,
  });

  return blob;
}

// Server-side upload for profile photos
export async function uploadProfilePhoto(
  file: File,
  userId: string
): Promise<PutBlobResult> {
  if (!isProfileMimeType(file.type)) {
    throw new Error('Tipo de ficheiro inválido para a foto de perfil');
  }

  const blob = await put(`${BLOB_PATHS.PROFILE_PHOTOS}/${userId}/${file.name}`, file, {
    access: 'public',
  });

  return blob;
}

export async function listProfilePhotos(userId: string): Promise<ListBlobResult> {
  const prefix = `${BLOB_PATHS.PROFILE_PHOTOS}/${userId}/`;
  return await list({ prefix });
}

export async function uploadDeliverableFile(
  file: File, 
  deliverableId: string,
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
): Promise<PutBlobResult> {
  if (!isDeliverableMimeType(file.type)) {
    throw new Error('Tipo de ficheiro inválido para a entrega');
  }

  if (file.size > MAX_FILE_SIZES.DELIVERABLE) {
    throw new Error('Ficheiro excede o tamanho máximo permitido (50MB)');
  }

  const pathname = `${BLOB_PATHS.DELIVERABLE_FILES}/${deliverableId}/${file.name}`;
  
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    onUploadProgress: onProgress,
  });

  return blob;
}

export async function deleteFile(url: string): Promise<void> {
  await del(url);
}
