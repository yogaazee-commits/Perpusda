"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Memuat variabel dari file .env di awal proses
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const middleware_1 = require("./middleware");
const minio_1 = require("./minio");
const ai_controller_1 = require("./ai.controller");
const buku_controller_1 = require("./buku.controller");
const user_controller_1 = require("./user.controller");
const master_controller_1 = require("./master.controller");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Konfigurasi Multer untuk upload PDF (maksimal 50 MB, validasi ekstensi .pdf)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // Maksimal 50 MB
    },
    fileFilter: (req, file, cb) => {
        const isPdfExt = path_1.default.extname(file.originalname).toLowerCase() === '.pdf';
        const isPdfMime = file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/x-pdf' ||
            file.mimetype === 'application/octet-stream';
        if (isPdfExt || isPdfMime) {
            cb(null, true);
        }
        else {
            cb(new Error('Format file tidak didukung! Hanya file PDF (.pdf) yang diperbolehkan.'));
        }
    },
});
// Middleware wrapper untuk menangani error Multer dengan rapi
const uploadMiddleware = (req, res, next) => {
    upload.single('filePdf')(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
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
        }
        else if (err) {
            return res.status(400).json({
                success: false,
                error: err.message,
            });
        }
        next();
    });
};
// Route status server
app.get('/', (req, res) => {
    res.json({
        message: 'Server Perpus Digital Karanganyar Ready!',
        status: 'online',
        timestamp: new Date().toISOString(),
    });
});
// ==========================================
// 1. Auth & User CRUD Routes
// ==========================================
app.post('/register', user_controller_1.registerUser);
app.post('/login', user_controller_1.loginUser);
app.get('/users', middleware_1.verifikasiToken, middleware_1.khususAdmin, user_controller_1.getSemuaUser);
app.get('/users/:id', middleware_1.verifikasiToken, user_controller_1.getUserById);
app.put('/users/:id', middleware_1.verifikasiToken, middleware_1.khususAdmin, user_controller_1.updateUser);
app.delete('/users/:id', middleware_1.verifikasiToken, middleware_1.khususAdmin, user_controller_1.hapusUser);
// Many-to-Many Pivot user_roles
app.get('/users/:id/roles', middleware_1.verifikasiToken, user_controller_1.getRolesByUser);
app.post('/users/:id/roles', middleware_1.verifikasiToken, middleware_1.khususAdmin, user_controller_1.tambahRoleKeUser);
app.delete('/users/:id/roles/:roleParam', middleware_1.verifikasiToken, middleware_1.khususAdmin, user_controller_1.hapusRoleDariUser);
// ==========================================
// 2. Master Role CRUD Routes
// ==========================================
app.get('/roles', middleware_1.verifikasiToken, user_controller_1.getSemuaRole);
app.get('/roles/:id', middleware_1.verifikasiToken, user_controller_1.getRoleById);
app.post('/roles', middleware_1.verifikasiToken, middleware_1.khususAdmin, user_controller_1.tambahRole);
app.put('/roles/:id', middleware_1.verifikasiToken, middleware_1.khususAdmin, user_controller_1.updateRole);
app.delete('/roles/:id', middleware_1.verifikasiToken, middleware_1.khususAdmin, user_controller_1.hapusRole);
// ==========================================
// 3. Endpoint Buku CRUD & Upload MinIO S3
// ==========================================
app.post('/buku', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), uploadMiddleware, buku_controller_1.tambahBuku);
app.get('/buku', middleware_1.verifikasiToken, buku_controller_1.getSemuaBuku);
app.get('/buku/:id', middleware_1.verifikasiToken, buku_controller_1.getBukuById);
app.put('/buku/:id', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), uploadMiddleware, buku_controller_1.updateBuku);
app.patch('/buku/:id/status', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), buku_controller_1.ubahStatusBuku);
app.get('/buku/:id/pdf', middleware_1.verifikasiToken, buku_controller_1.streamBukuPdf);
app.delete('/buku/:id', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), buku_controller_1.hapusBuku);
// Endpoint alternatif untuk upload PDF saja ke MinIO
app.post('/upload/pdf', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), uploadMiddleware, buku_controller_1.uploadHanyaPdf);
// ==========================================
// 4. Master Kategori CRUD Routes
// ==========================================
app.get('/kategori', middleware_1.verifikasiToken, master_controller_1.getSemuaKategori);
app.get('/kategori/:id', middleware_1.verifikasiToken, master_controller_1.getKategoriById);
app.post('/kategori', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), master_controller_1.tambahKategori);
app.put('/kategori/:id', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), master_controller_1.updateKategori);
app.delete('/kategori/:id', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), master_controller_1.hapusKategori);
// ==========================================
// 5. Master Jenis Literatur CRUD Routes
// ==========================================
app.get('/jenis-literatur', middleware_1.verifikasiToken, master_controller_1.getSemuaJenisLiteratur);
app.get('/jenis-literatur/:id', middleware_1.verifikasiToken, master_controller_1.getJenisLiteraturById);
app.post('/jenis-literatur', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), master_controller_1.tambahJenisLiteratur);
app.put('/jenis-literatur/:id', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), master_controller_1.updateJenisLiteratur);
app.delete('/jenis-literatur/:id', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), master_controller_1.hapusJenisLiteratur);
// ==========================================
// 6. Transaksional Usulan Buku CRUD Routes
// ==========================================
app.get('/usulan-buku', middleware_1.verifikasiToken, master_controller_1.getSemuaUsulanBuku);
app.get('/usulan-buku/:id', middleware_1.verifikasiToken, master_controller_1.getUsulanBukuById);
app.post('/usulan-buku', middleware_1.verifikasiToken, master_controller_1.tambahUsulanBuku);
app.delete('/usulan-buku/:id', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), master_controller_1.hapusUsulanBuku);
// ==========================================
// 7. Transaksional Sumbangan Buku CRUD Routes
// ==========================================
app.get('/sumbangan-buku', middleware_1.verifikasiToken, master_controller_1.getSemuaSumbanganBuku);
app.get('/sumbangan-buku/:id', middleware_1.verifikasiToken, master_controller_1.getSumbanganBukuById);
app.post('/sumbangan-buku', middleware_1.verifikasiToken, master_controller_1.tambahSumbanganBuku);
app.delete('/sumbangan-buku/:id', middleware_1.verifikasiToken, (0, middleware_1.cekRole)('ADMIN', 'PETUGAS'), master_controller_1.hapusSumbanganBuku);
// ==========================================
// 8. Endpoint AI Gemini
// ==========================================
app.post('/api/ai', ai_controller_1.tanyaPustakawanAI);
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, async () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    // Inisialisasi dan verifikasi koneksi MinIO
    await (0, minio_1.initMinioBucket)();
});
