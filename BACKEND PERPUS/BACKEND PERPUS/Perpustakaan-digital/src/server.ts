import dotenv from 'dotenv';
dotenv.config(); // Memuat variabel dari file .env di awal proses

import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import multer from 'multer';

import { verifikasiToken, verifikasiTokenOpsional, khususAdmin, cekRole } from './middleware';
import { initMinioBucket } from './minio';
import { tanyaPustakawanAI } from './ai.controller';
import {
  catatAksesBukuManual,
  getStatistikBukuPembaca,
  getStatistikGlobalPembaca,
  getSemuaLogPembaca,
  getRiwayatBacaUser,
} from './log-pembaca.controller';
import {
  tambahBuku,
  getSemuaBuku,
  getBukuById,
  streamBukuPdf,
  hapusBuku,
  uploadHanyaPdf,
  ubahStatusBuku,
  updateBuku,
} from './buku.controller';
import {
  registerUser,
  loginUser,
  getSemuaUser,
  getUserById,
  updateUser,
  hapusUser,
  getRolesByUser,
  tambahRoleKeUser,
  hapusRoleDariUser,
  getSemuaRole,
  getRoleById,
  tambahRole,
  updateRole,
  hapusRole,
} from './user.controller';
import {
  tambahKategori,
  getSemuaKategori,
  getKategoriById,
  updateKategori,
  hapusKategori,
  tambahJenisLiteratur,
  getSemuaJenisLiteratur,
  getJenisLiteraturById,
  updateJenisLiteratur,
  hapusJenisLiteratur,
  tambahUsulanBuku,
  getSemuaUsulanBuku,
  getUsulanBukuById,
  hapusUsulanBuku,
  tambahSumbanganBuku,
  getSemuaSumbanganBuku,
  getSumbanganBukuById,
  hapusSumbanganBuku,
} from './master.controller';

const app = express();

const allowedOrigins = new Set([
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  ...(process.env.FRONTEND_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(origin && allowedOrigins.has(origin) ? 204 : 403);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Konfigurasi Multer untuk upload PDF (maksimal 50 MB, validasi ekstensi .pdf)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // Maksimal 50 MB
  },
  fileFilter: (req, file, cb) => {
    const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';
    const isPdfMime =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/x-pdf' ||
      file.mimetype === 'application/octet-stream';

    if (isPdfExt || isPdfMime) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung! Hanya file PDF (.pdf) yang diperbolehkan.'));
    }
  },
});

// Middleware wrapper untuk menangani error Multer dengan rapi
const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single('filePdf')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Ukuran file terlalu besar (maksimal 50 MB)',
        });
      }
      return res.status(400).json({
        success: false,
        error: `Error upload file: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
    next();
  });
};

// Route status server
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Server Perpus Digital Karanganyar Ready!',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 1. Auth & User CRUD Routes
// ==========================================
app.post('/register', registerUser);
app.post('/login', loginUser);
app.get('/users', verifikasiToken, khususAdmin, getSemuaUser);
app.get('/users/:id', verifikasiToken, getUserById);
app.put('/users/:id', verifikasiToken, khususAdmin, updateUser);
app.delete('/users/:id', verifikasiToken, khususAdmin, hapusUser);

// Many-to-Many Pivot user_roles
app.get('/users/:id/roles', verifikasiToken, getRolesByUser);
app.post('/users/:id/roles', verifikasiToken, khususAdmin, tambahRoleKeUser);
app.delete('/users/:id/roles/:roleParam', verifikasiToken, khususAdmin, hapusRoleDariUser);

// ==========================================
// 2. Master Role CRUD Routes
// ==========================================
app.get('/roles', verifikasiToken, getSemuaRole);
app.get('/roles/:id', verifikasiToken, getRoleById);
app.post('/roles', verifikasiToken, khususAdmin, tambahRole);
app.put('/roles/:id', verifikasiToken, khususAdmin, updateRole);
app.delete('/roles/:id', verifikasiToken, khususAdmin, hapusRole);

// ==========================================
// 3. Endpoint Buku CRUD & Upload MinIO S3
// ==========================================
app.post('/buku', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), uploadMiddleware, tambahBuku);
app.get('/buku', verifikasiTokenOpsional, getSemuaBuku);
app.get('/buku/:id', verifikasiTokenOpsional, getBukuById);
app.put('/buku/:id', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), uploadMiddleware, updateBuku);
app.patch('/buku/:id/status', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), ubahStatusBuku);
app.get('/buku/:id/pdf', verifikasiTokenOpsional, streamBukuPdf);
app.post('/buku/:id/baca', verifikasiTokenOpsional, catatAksesBukuManual);
app.get('/buku/:id/statistik-pembaca', verifikasiTokenOpsional, getStatistikBukuPembaca);
app.delete('/buku/:id', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), hapusBuku);

// Endpoint alternatif untuk upload PDF saja ke MinIO
app.post('/upload/pdf', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), uploadMiddleware, uploadHanyaPdf);

// ==========================================
// 4. Master Kategori CRUD Routes
// ==========================================
app.get('/kategori', verifikasiToken, getSemuaKategori);
app.get('/kategori/:id', verifikasiToken, getKategoriById);
app.post('/kategori', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), tambahKategori);
app.put('/kategori/:id', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), updateKategori);
app.delete('/kategori/:id', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), hapusKategori);

// ==========================================
// 5. Master Jenis Literatur CRUD Routes
// ==========================================
app.get('/jenis-literatur', verifikasiToken, getSemuaJenisLiteratur);
app.get('/jenis-literatur/:id', verifikasiToken, getJenisLiteraturById);
app.post('/jenis-literatur', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), tambahJenisLiteratur);
app.put('/jenis-literatur/:id', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), updateJenisLiteratur);
app.delete('/jenis-literatur/:id', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), hapusJenisLiteratur);

// ==========================================
// 6. Transaksional Usulan Buku CRUD Routes
// ==========================================
app.get('/usulan-buku', verifikasiToken, getSemuaUsulanBuku);
app.get('/usulan-buku/:id', verifikasiToken, getUsulanBukuById);
app.post('/usulan-buku', verifikasiToken, tambahUsulanBuku);
app.delete('/usulan-buku/:id', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), hapusUsulanBuku);

// ==========================================
// 7. Transaksional Sumbangan Buku CRUD Routes
// ==========================================
app.get('/sumbangan-buku', verifikasiToken, getSemuaSumbanganBuku);
app.get('/sumbangan-buku/:id', verifikasiToken, getSumbanganBukuById);
app.post('/sumbangan-buku', verifikasiToken, tambahSumbanganBuku);
app.delete('/sumbangan-buku/:id', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), hapusSumbanganBuku);

// ==========================================
// 8. Endpoint AI Gemini
// ==========================================
app.post('/api/ai', tanyaPustakawanAI);

// ==========================================
// 9. Endpoint Log Pembaca & Statistik Akses Buku
// ==========================================
// Catat akses membaca buku (dapat diakses baik user login maupun tamu)
app.post('/log-pembaca', verifikasiTokenOpsional, catatAksesBukuManual);

// Statistik pembaca buku global (atau filter per bukuId & tanggal X)
app.get('/log-pembaca/statistik', verifikasiTokenOpsional, getStatistikGlobalPembaca);

// Audit riwayat log pembaca lengkap (khusus Admin & Petugas)
app.get('/log-pembaca', verifikasiToken, cekRole('ADMIN', 'PETUGAS'), getSemuaLogPembaca);

// Riwayat membaca pribadi untuk user terdaftar
app.get('/log-pembaca/saya', verifikasiToken, getRiwayatBacaUser);
app.get('/users/:id/riwayat-baca', verifikasiToken, getRiwayatBacaUser);

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, async () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  // Inisialisasi dan verifikasi koneksi MinIO
  await initMinioBucket();
});