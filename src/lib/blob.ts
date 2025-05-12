import { put, del, list } from '@vercel/blob';
import type { PutBlobResult, ListBlobResult } from '@vercel/blob';

export const ALLOWED_FILE_TYPES = {
  // Images for user profiles
  PROFILE: ['image/jpeg', 'image/png', 'image/gif'],
  // Documents and other files for deliverables
  DELIVERABLE: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'application/zip'
  ]
};

export const BLOB_PATHS = {
  PROFILE_PHOTOS: 'fotos-perfil',
  DELIVERABLE_FILES: 'anexos-entregaveis'
};

export async function uploadProfilePhoto(file: File, userId: string): Promise<PutBlobResult> {
  if (!ALLOWED_FILE_TYPES.PROFILE.includes(file.type)) {
    throw new Error('Tipo de ficheiro inválido para a foto de perfil');
  }

  const blob = await put(`${BLOB_PATHS.PROFILE_PHOTOS}/${userId}/${file.name}`, file, {
    access: 'public',
    token: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN
  });

  return blob;
}

export async function listProfilePhotos(userId: string): Promise<ListBlobResult> {
  const prefix = `${BLOB_PATHS.PROFILE_PHOTOS}/${userId}/`;
  return await list({ 
    prefix,
    token: process.env.BLOB_READ_WRITE_TOKEN 
  });
}

export async function uploadDeliverableFile(
  file: File, 
  deliverableId: string
): Promise<PutBlobResult> {
  if (!ALLOWED_FILE_TYPES.DELIVERABLE.includes(file.type)) {
    throw new Error('Tipo de ficheiro inválido para a entrega');
  }

  const blob = await put(`${BLOB_PATHS.DELIVERABLE_FILES}/${deliverableId}/${file.name}`, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  return blob;
}

export async function deleteFile(url: string): Promise<void> {
  await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
