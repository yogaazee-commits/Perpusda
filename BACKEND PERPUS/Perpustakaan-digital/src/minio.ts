import * as Minio from 'minio';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'node:crypto';

dotenv.config();

export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'tesperpus';

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name
  return String(error)
}

/**
 * Memastikan bucket MinIO sudah tersedia. Jika belum ada, akan dibuat secara otomatis.
 */
export async function initMinioBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`[MinIO] Bucket "${BUCKET_NAME}" berhasil dibuat.`);
    } else {
      console.log(`[MinIO] Terhubung ke bucket "${BUCKET_NAME}".`);
    }
  } catch (error) {
    console.warn(`[MinIO Warning] Layanan MinIO belum terhubung (${errorMessage(error)}). Sistem menggunakan fallback folder lokal "uploads/".`);
  }
}

/**
 * Upload file PDF ke MinIO S3 bucket dengan metadata application/pdf,
 * atau simpan lokal ke folder uploads/ jika MinIO offline.
 */
export async function uploadPdfToMinio(file: {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype?: string;
}): Promise<{ fileName: string; bucket: string; size: number; url: string }> {
  // Sanitasi nama file dan gunakan UUID v4 unik
  const extension = path.extname(file.originalname).toLowerCase() || '.pdf';
  const baseName = path
    .basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);

  const fileUuid = randomUUID();
  const fileName = baseName ? `${fileUuid}-${baseName}${extension}` : `${fileUuid}${extension}`;

  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
    }

    const metaData = {
      'Content-Type': 'application/pdf',
      'Original-Filename': encodeURIComponent(file.originalname),
    };

    await minioClient.putObject(
      BUCKET_NAME,
      fileName,
      file.buffer,
      file.size,
      metaData
    );

    const url = await getFileUrl(fileName, 24 * 60 * 60);

    return {
      fileName,
      bucket: BUCKET_NAME,
      size: file.size,
      url,
    };
  } catch (error) {
    console.warn(`[MinIO Warning] Upload gagal (${errorMessage(error)}). File akan disimpan di folder lokal "uploads/".`);
    // Fallback simpan ke folder uploads lokal
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localFilePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(localFilePath, file.buffer);

    return {
      fileName,
      bucket: 'local-uploads',
      size: file.size,
      url: `/uploads/${fileName}`,
    };
  }
}

/**
 * Mendapatkan Presigned URL untuk membaca/mengunduh file dari MinIO,
 * atau URL endpoint statis lokal jika MinIO tidak tersedia.
 */
export async function getFileUrl(
  fileName: string,
  expirySeconds: number = 24 * 60 * 60
): Promise<string> {
  try {
    return await minioClient.presignedGetObject(BUCKET_NAME, fileName, expirySeconds);
  } catch {
    return `/uploads/${fileName}`;
  }
}

/**
 * Mengambil stream file dari MinIO atau dari folder uploads lokal
 */
export async function getFileStream(fileName: string) {
  try {
    const stat = await minioClient.statObject(BUCKET_NAME, fileName);
    const stream = await minioClient.getObject(BUCKET_NAME, fileName);
    return { stream, stat };
  } catch {
    const localFilePath = path.resolve(process.cwd(), 'uploads', fileName);
    if (fs.existsSync(localFilePath)) {
      const stat = fs.statSync(localFilePath);
      const stream = fs.createReadStream(localFilePath);
      return { stream, stat: { size: stat.size } };
    }
    throw new Error(`File "${fileName}" tidak ditemukan di MinIO maupun di folder penyimpanan lokal.`);
  }
}

/**
 * Menghapus file dari MinIO atau dari folder uploads lokal
 */
export async function deleteFileFromMinio(fileName: string): Promise<void> {
  try {
    await minioClient.removeObject(BUCKET_NAME, fileName);
    console.log(`[MinIO] File "${fileName}" berhasil dihapus dari bucket.`);
  } catch {
    const localFilePath = path.resolve(process.cwd(), 'uploads', fileName);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      console.log(`[Local] File "${fileName}" berhasil dihapus dari uploads/.`);
    }
  }
}