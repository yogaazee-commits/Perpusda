"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.minioClient = exports.BUCKET_NAME = void 0;
exports.initMinioBucket = initMinioBucket;
exports.uploadPdfToMinio = uploadPdfToMinio;
exports.getFileUrl = getFileUrl;
exports.getFileStream = getFileStream;
exports.deleteFileFromMinio = deleteFileFromMinio;
const Minio = __importStar(require("minio"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const node_crypto_1 = require("node:crypto");
dotenv_1.default.config();
exports.BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'tesperpus';
exports.minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});
/**
 * Memastikan bucket MinIO sudah tersedia. Jika belum ada, akan dibuat secara otomatis.
 */
async function initMinioBucket() {
    try {
        const exists = await exports.minioClient.bucketExists(exports.BUCKET_NAME);
        if (!exists) {
            await exports.minioClient.makeBucket(exports.BUCKET_NAME, 'us-east-1');
            console.log(`[MinIO] Bucket "${exports.BUCKET_NAME}" berhasil dibuat.`);
        }
        else {
            console.log(`[MinIO] Terhubung ke bucket "${exports.BUCKET_NAME}".`);
        }
    }
    catch (error) {
        console.warn(`[MinIO Warning] Layanan MinIO belum terhubung (${error.message}). Sistem menggunakan fallback folder lokal "uploads/".`);
    }
}
/**
 * Upload file PDF ke MinIO S3 bucket dengan metadata application/pdf,
 * atau simpan lokal ke folder uploads/ jika MinIO offline.
 */
async function uploadPdfToMinio(file) {
    // Sanitasi nama file dan gunakan UUID v4 unik
    const extension = path_1.default.extname(file.originalname).toLowerCase() || '.pdf';
    const baseName = path_1.default
        .basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 50);
    const fileUuid = (0, node_crypto_1.randomUUID)();
    const fileName = baseName ? `${fileUuid}-${baseName}${extension}` : `${fileUuid}${extension}`;
    try {
        const exists = await exports.minioClient.bucketExists(exports.BUCKET_NAME);
        if (!exists) {
            await exports.minioClient.makeBucket(exports.BUCKET_NAME, 'us-east-1');
        }
        const metaData = {
            'Content-Type': 'application/pdf',
            'Original-Filename': encodeURIComponent(file.originalname),
        };
        await exports.minioClient.putObject(exports.BUCKET_NAME, fileName, file.buffer, file.size, metaData);
        const url = await getFileUrl(fileName, 24 * 60 * 60);
        return {
            fileName,
            bucket: exports.BUCKET_NAME,
            size: file.size,
            url,
        };
    }
    catch (error) {
        // Fallback simpan ke folder uploads lokal
        const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        const localFilePath = path_1.default.join(uploadsDir, fileName);
        fs_1.default.writeFileSync(localFilePath, file.buffer);
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
async function getFileUrl(fileName, expirySeconds = 24 * 60 * 60) {
    try {
        return await exports.minioClient.presignedGetObject(exports.BUCKET_NAME, fileName, expirySeconds);
    }
    catch {
        return `/uploads/${fileName}`;
    }
}
/**
 * Mengambil stream file dari MinIO atau dari folder uploads lokal
 */
async function getFileStream(fileName) {
    try {
        const stat = await exports.minioClient.statObject(exports.BUCKET_NAME, fileName);
        const stream = await exports.minioClient.getObject(exports.BUCKET_NAME, fileName);
        return { stream, stat };
    }
    catch {
        const localFilePath = path_1.default.resolve(process.cwd(), 'uploads', fileName);
        if (fs_1.default.existsSync(localFilePath)) {
            const stat = fs_1.default.statSync(localFilePath);
            const stream = fs_1.default.createReadStream(localFilePath);
            return { stream, stat: { size: stat.size } };
        }
        throw new Error(`File "${fileName}" tidak ditemukan di MinIO maupun di folder penyimpanan lokal.`);
    }
}
/**
 * Menghapus file dari MinIO atau dari folder uploads lokal
 */
async function deleteFileFromMinio(fileName) {
    try {
        await exports.minioClient.removeObject(exports.BUCKET_NAME, fileName);
        console.log(`[MinIO] File "${fileName}" berhasil dihapus dari bucket.`);
    }
    catch {
        const localFilePath = path_1.default.resolve(process.cwd(), 'uploads', fileName);
        if (fs_1.default.existsSync(localFilePath)) {
            fs_1.default.unlinkSync(localFilePath);
            console.log(`[Local] File "${fileName}" berhasil dihapus dari uploads/.`);
        }
    }
}
