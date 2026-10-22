import 'multer';
import type { Request, Response } from 'express';
import prisma from './prisma';
import { uploadPdfToMinio, getFileUrl, getFileStream, deleteFileFromMinio } from './minio';
import { catatAksesBuku } from './log-pembaca.controller';

/**
 * Controller untuk mengupload file PDF saja ke MinIO
 */
export async function uploadHanyaPdf(req: Request, res: Response): Promise<any> {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'File PDF wajib diunggah dengan field name "filePdf"!',
      });
    }

    const uploadResult = await uploadPdfToMinio(file);

    return res.status(201).json({
      success: true,
      message: 'File PDF berhasil diunggah ke MinIO!',
      data: uploadResult,
    });
  } catch (error: any) {
    console.error('Error upload PDF ke MinIO:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengunggah file ke MinIO',
      detail: error.message,
    });
  }
}

/**
 * Controller untuk menambahkan buku baru lengkap dengan status aktif/nonaktif dan file PDF
 */
export async function tambahBuku(req: Request, res: Response): Promise<any> {
  let uploadedFileName: string | null = null;

  try {
    const file = req.file;
    const {
      judul,
      penulis,
      penerbit,
      tahunTerbit,
      isGratis,
      isActive,
      kategoriId,
      jenisLiteraturId,
    } = req.body || {};

    // Validasi input wajib
    if (!judul || !penulis) {
      return res.status(400).json({
        success: false,
        error: 'Judul dan penulis buku wajib diisi!',
      });
    }

    let pdfUrl: string | null = null;

    // Jika ada file PDF yang diunggah, proses upload ke MinIO
    if (file) {
      const uploadResult = await uploadPdfToMinio(file);
      uploadedFileName = uploadResult.fileName;
      pdfUrl = uploadResult.url;
    }

    // Parsing tipe data form-data
    const parsedTahun = tahunTerbit ? parseInt(tahunTerbit, 10) : null;
    const parsedIsGratis =
      isGratis !== undefined
        ? isGratis === 'true' || isGratis === true || isGratis === '1'
        : true;

    // Status aktif / nonaktif (default: true)
    let parsedIsActive = true;
    if (isActive !== undefined) {
      parsedIsActive =
        isActive === 'true' || isActive === true || isActive === '1' || isActive === 1;
    } else if (req.body?.status !== undefined) {
      const s = String(req.body.status).toLowerCase();
      parsedIsActive = s === 'aktif' || s === 'active' || s === 'true' || s === '1';
    }

    // Simpan data buku ke MySQL via Prisma
    const bukuBaru = await prisma.buku.create({
      data: {
        judul,
        penulis,
        penerbit: penerbit || null,
        tahunTerbit: isNaN(parsedTahun as number) ? null : parsedTahun,
        filePdf: uploadedFileName,
        isGratis: parsedIsGratis,
        isActive: parsedIsActive,
        kategoriId: kategoriId || null,
        jenisLiteraturId: jenisLiteraturId || null,
        createdBy: (req as any).user?.userId || null,
      },
      include: {
        kategori: true,
        jenisLiteratur: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Buku berhasil ditambahkan dan PDF tersimpan!',
      data: {
        ...bukuBaru,
        status: bukuBaru.isActive ? 'AKTIF' : 'NONAKTIF',
        pdfUrl,
      },
    });
  } catch (error: any) {
    console.error('Error tambah buku:', error);

    // Rollback: jika simpan ke database gagal, hapus file yang sempat terupload
    if (uploadedFileName) {
      await deleteFileFromMinio(uploadedFileName);
    }

    return res.status(500).json({
      success: false,
      error: 'Gagal menambahkan buku',
      detail: error.message,
    });
  }
}

/**
 * Controller untuk mendapatkan semua data buku (bisa difilter status=aktif / nonaktif / all, pencarian judul/penulis)
 */
export async function getSemuaBuku(req: Request, res: Response): Promise<any> {
  try {
    const rawStatus = req.query.status;
    const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : undefined;
    const rawIsActive = req.query.isActive;
    const isActive = typeof rawIsActive === 'string' ? rawIsActive.toLowerCase() : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : typeof req.query.q === 'string' ? req.query.q : undefined;
    const kategoriId = typeof req.query.kategoriId === 'string' ? req.query.kategoriId : undefined;

    // Periksa role user pemohon
    const userRoles: string[] = (req as any).user?.roles || [];
    const isAdminOrStaff = userRoles.some((r) => ['ADMIN', 'PETUGAS'].includes(r.toUpperCase()));

    // Kondisi filter awal: hanya buku yang belum dihapus (soft delete)
    let whereCondition: any = { isDeleted: false };

    // Proteksi status aktif/nonaktif:
    // Pengguna biasa/anggota HANYA dapat melihat buku aktif (isActive = true)
    if (!isAdminOrStaff) {
      whereCondition.isActive = true;
    } else {
      // Khusus Admin / Petugas: dapat memfilter status buku
      if (status === 'aktif' || isActive === 'true' || isActive === '1') {
        whereCondition.isActive = true;
      } else if (status === 'nonaktif' || isActive === 'false' || isActive === '0') {
        whereCondition.isActive = false;
      } else if (status === 'all') {
        // Tampilkan semua buku (aktif maupun nonaktif)
      } else {
        // Default untuk admin jika tidak mengirim filter status: tampilkan semua
      }
    }

    // Filter kategori jika diberikan
    if (kategoriId) {
      whereCondition.kategoriId = kategoriId;
    }

    // Pencarian berdasarkan judul atau penulis jika diberikan
    if (search && search.trim()) {
      whereCondition.OR = [
        { judul: { contains: search.trim() } },
        { penulis: { contains: search.trim() } },
      ];
    }

    const daftarBuku = await prisma.buku.findMany({
      where: whereCondition,
      include: {
        kategori: true,
        jenisLiteratur: true,
        _count: {
          select: { logPembaca: { where: { isDeleted: false } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate URL akses dan status badge untuk setiap buku
    const bukuWithUrl = await Promise.all(
      daftarBuku.map(async (buku) => {
        let pdfUrl = null;
        if (buku.filePdf) {
          try {
            pdfUrl = await getFileUrl(buku.filePdf);
          } catch {
            pdfUrl = null;
          }
        }
        return {
          ...buku,
          status: buku.isActive ? 'AKTIF' : 'NONAKTIF',
          totalDibaca: (buku as any)._count?.logPembaca || 0,
          pdfUrl,
        };
      })
    );

    return res.json({
      success: true,
      filter: {
        status: status || (isActive !== undefined ? `isActive=${isActive}` : (!isAdminOrStaff ? 'aktif' : 'semua')),
        search: search || null,
        kategoriId: kategoriId || null,
      },
      total: bukuWithUrl.length,
      data: bukuWithUrl,
    });
  } catch (error: any) {
    console.error('Error get buku:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil data buku',
      detail: error.message,
    });
  }
}

/**
 * Controller untuk mendapatkan detail buku berdasarkan ID
 */
export async function getBukuById(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID buku tidak valid',
      });
    }

    const buku = await prisma.buku.findFirst({
      where: { id, isDeleted: false },
      include: {
        kategori: true,
        jenisLiteratur: true,
        _count: {
          select: { logPembaca: { where: { isDeleted: false } } },
        },
      },
    });

    if (!buku) {
      return res.status(404).json({
        success: false,
        error: 'Buku tidak ditemukan',
      });
    }

    // Proteksi buku nonaktif: hanya Admin & Petugas yang dapat mengakses detail buku nonaktif
    if (!buku.isActive) {
      const userRoles: string[] = (req as any).user?.roles || [];
      const isAdminOrStaff = userRoles.some((r) => ['ADMIN', 'PETUGAS'].includes(r.toUpperCase()));

      if (!isAdminOrStaff) {
        return res.status(403).json({
          success: false,
          error: 'Buku ini sedang dinonaktifkan sementara dan tidak dapat diakses.',
          status: 'NONAKTIF',
        });
      }
    }

    // Jika klien mengirim parameter ?catat=true, catat akses baca ke log pembaca
    if (req.query.catat === 'true' || req.query.baca === 'true') {
      await catatAksesBuku(buku.id, req);
    }

    let pdfUrl = null;
    if (buku.filePdf) {
      try {
        pdfUrl = await getFileUrl(buku.filePdf);
      } catch {
        pdfUrl = null;
      }
    }

    return res.json({
      success: true,
      data: {
        ...buku,
        status: buku.isActive ? 'AKTIF' : 'NONAKTIF',
        totalDibaca: (buku as any)._count?.logPembaca || 0,
        pdfUrl,
      },
    });
  } catch (error: any) {
    console.error('Error get detail buku:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil detail buku',
      detail: error.message,
    });
  }
}

/**
 * Controller untuk mengubah status aktif / nonaktif buku (Flag Status Buku)
 * Endpoint: PATCH /buku/:id/status
 */
export async function ubahStatusBuku(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID buku tidak valid',
      });
    }

    const buku = await prisma.buku.findFirst({
      where: { id, isDeleted: false },
    });

    if (!buku) {
      return res.status(404).json({
        success: false,
        error: 'Buku tidak ditemukan',
      });
    }

    // Mendukung input boolean isActive, string status ('aktif'/'nonaktif'), atau toggle otomatis jika body kosong
    let targetStatus: boolean;
    const body = req.body || {};
    if (body.isActive !== undefined) {
      const val = body.isActive;
      targetStatus = val === true || val === 'true' || val === 1 || val === '1';
    } else if (body.status !== undefined) {
      const s = String(body.status).toLowerCase();
      targetStatus = s === 'aktif' || s === 'active' || s === 'true' || s === '1';
    } else {
      // Toggle otomatis jika tidak dikirimkan di body
      targetStatus = !buku.isActive;
    }

    const updatedBuku = await prisma.buku.update({
      where: { id },
      data: {
        isActive: targetStatus,
        updatedBy: (req as any).user?.userId || null,
      },
      include: {
        kategori: true,
        jenisLiteratur: true,
      },
    });

    const statusLabel = updatedBuku.isActive ? 'AKTIF' : 'NONAKTIF';

    return res.json({
      success: true,
      message: `Status buku "${updatedBuku.judul}" berhasil diubah menjadi ${statusLabel}`,
      data: {
        id: updatedBuku.id,
        judul: updatedBuku.judul,
        isActive: updatedBuku.isActive,
        status: statusLabel,
        updatedAt: updatedBuku.updatedAt,
        updatedBy: updatedBuku.updatedBy,
      },
    });
  } catch (error: any) {
    console.error('Error ubah status buku:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengubah status buku',
      detail: error.message,
    });
  }
}

/**
 * Controller untuk update data buku (judul, penulis, status, dll.)
 * Endpoint: PUT /buku/:id
 */
export async function updateBuku(req: Request, res: Response): Promise<any> {
  let newUploadedFile: string | null = null;
  let oldFileToDelete: string | null = null;

  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID buku tidak valid' });
    }

    const buku = await prisma.buku.findFirst({ where: { id, isDeleted: false } });
    if (!buku) {
      return res.status(404).json({ success: false, error: 'Buku tidak ditemukan' });
    }

    const file = req.file;
    const {
      judul,
      penulis,
      penerbit,
      tahunTerbit,
      isGratis,
      isActive,
      kategoriId,
      jenisLiteraturId,
    } = req.body || {};

    let updateData: any = {
      updatedBy: (req as any).user?.userId || null,
    };

    if (judul !== undefined) updateData.judul = judul;
    if (penulis !== undefined) updateData.penulis = penulis;
    if (penerbit !== undefined) updateData.penerbit = penerbit;
    if (tahunTerbit !== undefined) updateData.tahunTerbit = parseInt(tahunTerbit, 10) || null;
    if (isGratis !== undefined) {
      updateData.isGratis = isGratis === true || isGratis === 'true' || isGratis === '1';
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive === true || isActive === 'true' || isActive === '1';
    } else if (req.body?.status !== undefined) {
      const s = String(req.body.status).toLowerCase();
      updateData.isActive = s === 'aktif' || s === 'active' || s === 'true' || s === '1';
    }
    if (kategoriId !== undefined) updateData.kategoriId = kategoriId || null;
    if (jenisLiteraturId !== undefined) updateData.jenisLiteraturId = jenisLiteraturId || null;

    // Jika mengunggah file PDF baru sebagai pengganti
    if (file) {
      const uploadResult = await uploadPdfToMinio(file);
      newUploadedFile = uploadResult.fileName;
      updateData.filePdf = newUploadedFile;
      oldFileToDelete = buku.filePdf;
    } else if (req.body?.hapusPdf === 'true' || req.body?.hapusPdf === true) {
      updateData.filePdf = null;
      oldFileToDelete = buku.filePdf;
    }

    const updatedBuku = await prisma.buku.update({
      where: { id },
      data: updateData,
      include: {
        kategori: true,
        jenisLiteratur: true,
      },
    });

    if (oldFileToDelete) {
      await deleteFileFromMinio(oldFileToDelete);
    }

    let pdfUrl = null;
    if (updatedBuku.filePdf) {
      try {
        pdfUrl = await getFileUrl(updatedBuku.filePdf);
      } catch {
        pdfUrl = null;
      }
    }

    return res.json({
      success: true,
      message: `Data buku "${updatedBuku.judul}" berhasil diperbarui`,
      data: {
        ...updatedBuku,
        status: updatedBuku.isActive ? 'AKTIF' : 'NONAKTIF',
        pdfUrl,
      },
    });
  } catch (error: any) {
    console.error('Error update buku:', error);
    if (newUploadedFile) {
      await deleteFileFromMinio(newUploadedFile);
    }
    return res.status(500).json({
      success: false,
      error: 'Gagal memperbarui data buku',
      detail: error.message,
    });
  }
}

/**
 * Controller untuk streaming / melihat langsung PDF buku di browser
 */
export async function streamBukuPdf(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID buku tidak valid',
      });
    }

    const buku = await prisma.buku.findFirst({
      where: { id, isDeleted: false },
    });

    if (!buku || !buku.filePdf) {
      return res.status(404).json({
        success: false,
        error: 'File PDF untuk buku ini tidak ditemukan',
      });
    }

    // Pengecekan flag status buku aktif
    if (!buku.isActive) {
      const userRoles: string[] = (req as any).user?.roles || [];
      const isAdminOrStaff = userRoles.some((r) => ['ADMIN', 'PETUGAS'].includes(r.toUpperCase()));

      if (!isAdminOrStaff) {
        return res.status(403).json({
          success: false,
          error: 'Buku ini sedang dinonaktifkan sementara oleh petugas perpustakaan.',
          status: 'NONAKTIF',
        });
      }
    }

    // Catat log pembaca otomatis (baik login maupun tamu/tanpa login)
    await catatAksesBuku(buku.id, req);

    const { stream, stat } = await getFileStream(buku.filePdf);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(buku.judul)}.pdf"`
    );

    return (stream as any).pipe(res);
  } catch (error: any) {
    console.error('Error stream PDF:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal membaca file PDF dari MinIO',
      detail: error.message,
    });
  }
}

/**
 * Controller untuk menghapus buku (soft delete dan hapus file di MinIO)
 */
export async function hapusBuku(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID buku tidak valid',
      });
    }

    const buku = await prisma.buku.findUnique({ where: { id } });

    if (!buku) {
      return res.status(404).json({
        success: false,
        error: 'Buku tidak ditemukan',
      });
    }

    // Hapus file dari MinIO jika ada
    if (buku.filePdf) {
      await deleteFileFromMinio(buku.filePdf);
    }

    // Soft delete buku
    await prisma.buku.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        updatedBy: (req as any).user?.userId || null,
      },
    });

    return res.json({
      success: true,
      message: 'Buku dan file PDF terkait berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error hapus buku:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal menghapus buku',
      detail: error.message,
    });
  }
}
