'use server';

import fs from 'fs/promises';
import path from 'path';

export async function imageToBase64(filename: string) {
  try {
    const filePath = path.join(process.cwd(), 'public', filename);
    const fileData = await fs.readFile(filePath);
    const base64 = fileData.toString('base64');
    const ext = path.extname(filename).slice(1).toLowerCase(); // e.g. "png"
    
    // Mapear extensões para tipos MIME
    const mimeType = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'svg': 'image/svg+xml',
    }[ext] || 'image/png';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Erro ao converter imagem para base64: ${filename}`, error);
    return '';
  }
} 