import type { Request, Response } from 'express';
import prisma from './prisma';

// ========================================================
// 1. KATEGORI BUKU CRUD (Master Data)
// ========================================================

/**
 * Tambah Kategori Baru (Create)
 */
export async function tambahKategori(req: Request, res: Response): Promise<any> {
  try {
    const { nama } = req.body || {};
    if (!nama || typeof nama !== 'string') {
      return res.status(400).json({ success: false, error: 'Nama kategori wajib diisi!' });
    }

    const namaTrim = nama.trim();
    const existing = await prisma.kategori.findFirst({
      where: { nama: namaTrim, isDeleted: false },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: `Kategori "${namaTrim}" sudah ada!` });
    }

    const creatorId = (req as any).user?.userId || null;
    const kategori = await prisma.kategori.create({
      data: {
        nama: namaTrim,
        createdBy: creatorId,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Kategori "${kategori.nama}" berhasil ditambahkan`,
      data: kategori,
    });
  } catch (error: any) {
    console.error('Error tambah kategori:', error);
    return res.status(500).json({ success: false, error: 'Gagal menambahkan kategori', detail: error.message });
  }
}

/**
 * Mendapatkan Semua Kategori (Read All)
 */
export async function getSemuaKategori(req: Request, res: Response): Promise<any> {
  try {
    const kategori = await prisma.kategori.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: { buku: { where: { isDeleted: false } } },
        },
      },
      orderBy: { nama: 'asc' },
    });

    return res.json({
      success: true,
      total: kategori.length,
      data: kategori.map((k: any) => ({
        id: k.id,
        nama: k.nama,
        totalBuku: k._count?.buku ?? 0,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error get kategori:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data kategori', detail: error.message });
  }
}

/**
 * Mendapatkan Detail Kategori Berdasarkan ID (Read One)
 */
export async function getKategoriById(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const kategori = await prisma.kategori.findFirst({
      where: { id, isDeleted: false },
      include: {
        buku: {
          where: { isDeleted: false },
          select: { id: true, judul: true, penulis: true, isActive: true },
        },
      },
    });

    if (!kategori) {
      return res.status(404).json({ success: false, error: 'Kategori tidak ditemukan' });
    }

    return res.json({
      success: true,
      data: kategori,
    });
  } catch (error: any) {
    console.error('Error get detail kategori:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil detail kategori', detail: error.message });
  }
}

/**
 * Memperbarui Kategori (Update)
 */
export async function updateKategori(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;
    const { nama } = req.body || {};

    if (!nama || typeof nama !== 'string') {
      return res.status(400).json({ success: false, error: 'Nama kategori baru wajib diisi!' });
    }

    const kategori = await prisma.kategori.findFirst({ where: { id, isDeleted: false } });
    if (!kategori) {
      return res.status(404).json({ success: false, error: 'Kategori tidak ditemukan' });
    }

    const updaterId = (req as any).user?.userId || null;
    const updated = await prisma.kategori.update({
      where: { id },
      data: {
        nama: nama.trim(),
        updatedBy: updaterId,
      },
    });

    return res.json({
      success: true,
      message: `Kategori berhasil diperbarui menjadi "${updated.nama}"`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error update kategori:', error);
    return res.status(500).json({ success: false, error: 'Gagal memperbarui kategori', detail: error.message });
  }
}

/**
 * Menghapus Kategori (Soft Delete)
 */
export async function hapusKategori(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const kategori = await prisma.kategori.findFirst({ where: { id, isDeleted: false } });
    if (!kategori) {
      return res.status(404).json({ success: false, error: 'Kategori tidak ditemukan' });
    }

    const updaterId = (req as any).user?.userId || null;
    await prisma.kategori.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: updaterId,
      },
    });

    return res.json({
      success: true,
      message: `Kategori "${kategori.nama}" berhasil dihapus`,
    });
  } catch (error: any) {
    console.error('Error hapus kategori:', error);
    return res.status(500).json({ success: false, error: 'Gagal menghapus kategori', detail: error.message });
  }
}

// ========================================================
// 2. JENIS LITERATUR CRUD (Master Data)
// ========================================================

/**
 * Tambah Jenis Literatur Baru (Create)
 */
export async function tambahJenisLiteratur(req: Request, res: Response): Promise<any> {
  try {
    const { nama } = req.body || {};
    if (!nama || typeof nama !== 'string') {
      return res.status(400).json({ success: false, error: 'Nama jenis literatur wajib diisi!' });
    }

    const namaTrim = nama.trim();
    const existing = await prisma.jenisLiteratur.findFirst({
      where: { nama: namaTrim, isDeleted: false },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: `Jenis literatur "${namaTrim}" sudah ada!` });
    }

    const creatorId = (req as any).user?.userId || null;
    const jenis = await prisma.jenisLiteratur.create({
      data: {
        nama: namaTrim,
        createdBy: creatorId,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Jenis literatur "${jenis.nama}" berhasil ditambahkan`,
      data: jenis,
    });
  } catch (error: any) {
    console.error('Error tambah jenis literatur:', error);
    return res.status(500).json({ success: false, error: 'Gagal menambahkan jenis literatur', detail: error.message });
  }
}

/**
 * Mendapatkan Semua Jenis Literatur (Read All)
 */
export async function getSemuaJenisLiteratur(req: Request, res: Response): Promise<any> {
  try {
    const daftar = await prisma.jenisLiteratur.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: { buku: { where: { isDeleted: false } } },
        },
      },
      orderBy: { nama: 'asc' },
    });

    return res.json({
      success: true,
      total: daftar.length,
      data: daftar.map((j: any) => ({
        id: j.id,
        nama: j.nama,
        totalBuku: j._count?.buku ?? 0,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error get jenis literatur:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil jenis literatur', detail: error.message });
  }
}

/**
 * Mendapatkan Detail Jenis Literatur Berdasarkan ID (Read One)
 */
export async function getJenisLiteraturById(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const item = await prisma.jenisLiteratur.findFirst({
      where: { id, isDeleted: false },
      include: {
        buku: {
          where: { isDeleted: false },
          select: { id: true, judul: true, penulis: true, isActive: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Jenis literatur tidak ditemukan' });
    }

    return res.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    console.error('Error get detail jenis literatur:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil detail jenis literatur', detail: error.message });
  }
}

/**
 * Memperbarui Jenis Literatur (Update)
 */
export async function updateJenisLiteratur(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;
    const { nama } = req.body || {};

    if (!nama || typeof nama !== 'string') {
      return res.status(400).json({ success: false, error: 'Nama jenis literatur baru wajib diisi!' });
    }

    const item = await prisma.jenisLiteratur.findFirst({ where: { id, isDeleted: false } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Jenis literatur tidak ditemukan' });
    }

    const updaterId = (req as any).user?.userId || null;
    const updated = await prisma.jenisLiteratur.update({
      where: { id },
      data: {
        nama: nama.trim(),
        updatedBy: updaterId,
      },
    });

    return res.json({
      success: true,
      message: `Jenis literatur berhasil diperbarui menjadi "${updated.nama}"`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error update jenis literatur:', error);
    return res.status(500).json({ success: false, error: 'Gagal memperbarui jenis literatur', detail: error.message });
  }
}

/**
 * Menghapus Jenis Literatur (Soft Delete)
 */
export async function hapusJenisLiteratur(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const item = await prisma.jenisLiteratur.findFirst({ where: { id, isDeleted: false } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Jenis literatur tidak ditemukan' });
    }

    const updaterId = (req as any).user?.userId || null;
    await prisma.jenisLiteratur.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: updaterId,
      },
    });

    return res.json({
      success: true,
      message: `Jenis literatur "${item.nama}" berhasil dihapus`,
    });
  } catch (error: any) {
    console.error('Error hapus jenis literatur:', error);
    return res.status(500).json({ success: false, error: 'Gagal menghapus jenis literatur', detail: error.message });
  }
}

// ========================================================
// 3. USULAN BUKU CRUD (Transaksi Usulan Anggota)
// ========================================================

/**
 * Tambah Usulan Buku Baru (Create)
 */
export async function tambahUsulanBuku(req: Request, res: Response): Promise<any> {
  try {
    const { judul, penulis, alasan } = req.body || {};
    if (!judul || !penulis) {
      return res.status(400).json({ success: false, error: 'Judul dan penulis buku wajib diisi!' });
    }

    let targetUserId: string;
    const userId = (req as any).user?.userId;
    if (!userId || userId === 'dev-mode-user') {
      // Ambil user pertama yang ada jika mode dev tanpa token
      const defaultUser = await prisma.user.findFirst({ where: { isDeleted: false } });
      if (!defaultUser) {
        return res.status(400).json({ success: false, error: 'User tidak ditemukan' });
      }
      targetUserId = defaultUser.id;
    } else {
      targetUserId = userId;
    }

    const usulan = await prisma.usulanBuku.create({
      data: {
        judul: judul.trim(),
        penulis: penulis.trim(),
        alasan: alasan ? String(alasan).trim() : null,
        userId: targetUserId,
        createdBy: targetUserId,
      },
      include: {
        user: { select: { id: true, nama: true, email: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Usulan buku berhasil diajukan',
      data: usulan,
    });
  } catch (error: any) {
    console.error('Error tambah usulan buku:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengajukan usulan buku', detail: error.message });
  }
}

/**
 * Mendapatkan Semua Usulan Buku (Read All)
 */
export async function getSemuaUsulanBuku(req: Request, res: Response): Promise<any> {
  try {
    const daftar = await prisma.usulanBuku.findMany({
      where: { isDeleted: false },
      include: {
        user: { select: { id: true, nama: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      total: daftar.length,
      data: daftar,
    });
  } catch (error: any) {
    console.error('Error get usulan buku:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data usulan buku', detail: error.message });
  }
}

/**
 * Mendapatkan Detail Usulan Buku Berdasarkan ID (Read One)
 */
export async function getUsulanBukuById(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const item = await prisma.usulanBuku.findFirst({
      where: { id, isDeleted: false },
      include: {
        user: { select: { id: true, nama: true, email: true } },
      },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Usulan buku tidak ditemukan' });
    }

    return res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Error get detail usulan buku:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil detail usulan buku', detail: error.message });
  }
}

/**
 * Menghapus Usulan Buku (Soft Delete)
 */
export async function hapusUsulanBuku(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const item = await prisma.usulanBuku.findFirst({ where: { id, isDeleted: false } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Usulan buku tidak ditemukan' });
    }

    const updaterId = (req as any).user?.userId || null;
    await prisma.usulanBuku.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: updaterId,
      },
    });

    return res.json({ success: true, message: 'Usulan buku berhasil dihapus' });
  } catch (error: any) {
    console.error('Error hapus usulan buku:', error);
    return res.status(500).json({ success: false, error: 'Gagal menghapus usulan buku', detail: error.message });
  }
}

// ========================================================
// 4. SUMBANGAN BUKU CRUD (Transaksi Sumbangan Buku Fisik)
// ========================================================

/**
 * Tambah Sumbangan Buku Baru (Create)
 */
export async function tambahSumbanganBuku(req: Request, res: Response): Promise<any> {
  try {
    const { judulBuku, penulis, kondisi, tahunTerbit } = req.body || {};
    if (!judulBuku || !penulis || !kondisi) {
      return res.status(400).json({
        success: false,
        error: 'Judul buku, penulis, dan kondisi buku (misal: Baik/Rusak Ringan) wajib diisi!',
      });
    }

    let targetUserId: string;
    const userId = (req as any).user?.userId;
    if (!userId || userId === 'dev-mode-user') {
      const defaultUser = await prisma.user.findFirst({ where: { isDeleted: false } });
      if (!defaultUser) {
        return res.status(400).json({ success: false, error: 'User tidak ditemukan' });
      }
      targetUserId = defaultUser.id;
    } else {
      targetUserId = userId;
    }

    const sumbangan = await prisma.sumbanganBuku.create({
      data: {
        judulBuku: judulBuku.trim(),
        penulis: penulis.trim(),
        kondisi: kondisi.trim(),
        tahunTerbit: tahunTerbit ? parseInt(tahunTerbit, 10) : null,
        userId: targetUserId,
        createdBy: targetUserId,
      },
      include: {
        user: { select: { id: true, nama: true, email: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Data sumbangan buku berhasil dicatat',
      data: sumbangan,
    });
  } catch (error: any) {
    console.error('Error tambah sumbangan buku:', error);
    return res.status(500).json({ success: false, error: 'Gagal mencatat sumbangan buku', detail: error.message });
  }
}

/**
 * Mendapatkan Semua Sumbangan Buku (Read All)
 */
export async function getSemuaSumbanganBuku(req: Request, res: Response): Promise<any> {
  try {
    const daftar = await prisma.sumbanganBuku.findMany({
      where: { isDeleted: false },
      include: {
        user: { select: { id: true, nama: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      total: daftar.length,
      data: daftar,
    });
  } catch (error: any) {
    console.error('Error get sumbangan buku:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data sumbangan buku', detail: error.message });
  }
}

/**
 * Mendapatkan Detail Sumbangan Buku Berdasarkan ID (Read One)
 */
export async function getSumbanganBukuById(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const item = await prisma.sumbanganBuku.findFirst({
      where: { id, isDeleted: false },
      include: {
        user: { select: { id: true, nama: true, email: true } },
      },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Data sumbangan buku tidak ditemukan' });
    }

    return res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Error get detail sumbangan buku:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil detail sumbangan buku', detail: error.message });
  }
}

/**
 * Menghapus Data Sumbangan Buku (Soft Delete)
 */
export async function hapusSumbanganBuku(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const item = await prisma.sumbanganBuku.findFirst({ where: { id, isDeleted: false } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Data sumbangan buku tidak ditemukan' });
    }

    const updaterId = (req as any).user?.userId || null;
    await prisma.sumbanganBuku.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: updaterId,
      },
    });

    return res.json({ success: true, message: 'Data sumbangan buku berhasil dihapus' });
  } catch (error: any) {
    console.error('Error hapus sumbangan buku:', error);
    return res.status(500).json({ success: false, error: 'Gagal menghapus data sumbangan buku', detail: error.message });
  }
}
