import type { Request, Response } from 'express';
import prisma from './prisma';

/**
 * Interface untuk hasil parsing rentang tanggal
 */
export interface DateRangeResult {
  tanggal: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Helper untuk mengonversi string tanggal YYYY-MM-DD ke rentang Date UTC
 * dengan memperhitungkan offset zona waktu WIB (UTC+7) sebagai default sistem Karanganyar.
 * Contoh: 2026-10-21 00:00:00 WIB = 2026-10-20 17:00:00 UTC
 */
export function parseDateRange(tanggalStr: string, timezoneOffsetHours: number = 7): DateRangeResult {
  const parts = tanggalStr.trim().split('-');
  if (parts.length !== 3) {
    throw new Error('Format tanggal tidak valid. Gunakan format YYYY-MM-DD (contoh: 2026-10-21)');
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error('Tanggal tidak valid. Pastikan tahun, bulan (1-12), dan hari (1-31) benar.');
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedTanggal = `${year}-${pad(month)}-${pad(day)}`;

  const offsetMs = timezoneOffsetHours * 60 * 60 * 1000;
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs);
  const endUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs);

  return {
    tanggal: formattedTanggal,
    startDate: startUtc,
    endDate: endUtc,
  };
}

/**
 * Mengonversi objek Date UTC ke string tanggal lokal WIB (YYYY-MM-DD)
 */
export function formatToLocalDateString(date: Date, timezoneOffsetHours: number = 7): string {
  const localTime = new Date(date.getTime() + timezoneOffsetHours * 60 * 60 * 1000);
  const y = localTime.getUTCFullYear();
  const m = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const d = String(localTime.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Core Helper Engine: Mencatat setiap akses pembaca ke buku.
 * Mendukung baik user terdaftar (login) maupun tamu / publik (tanpa login).
 * Jika login: userId terisi sesuai ID user di DB.
 * Jika tidak login: userId diset null, createdBy: 'GUEST'.
 */
export async function catatAksesBuku(bukuId: string, req: Request): Promise<any> {
  try {
    const rawUserId = (req as any).user?.userId;
    let finalUserId: string | null = null;

    // Jika ada userId dan bukan penanda default dev mode, verifikasi user di DB
    if (rawUserId && rawUserId !== 'dev-mode-user') {
      const userExists = await prisma.user.findFirst({
        where: { id: rawUserId, isDeleted: false },
        select: { id: true },
      });
      if (userExists) {
        finalUserId = userExists.id;
      }
    }

    const log = await prisma.logPembaca.create({
      data: {
        bukuId,
        userId: finalUserId, // null jika tamu / tidak login
        createdBy: finalUserId || 'GUEST',
        diaksesPada: new Date(),
      },
      include: {
        buku: {
          select: { id: true, judul: true, penulis: true },
        },
        user: {
          select: { id: true, nama: true, email: true },
        },
      },
    });

    return log;
  } catch (error) {
    console.error('Gagal mencatat log pembaca:', error);
    return null;
  }
}

/**
 * Controller: Mencatat akses baca buku secara manual / via API call
 * Endpoint: POST /buku/:id/baca atau POST /log-pembaca
 * Dapat diakses oleh siapa saja (login maupun guest)
 */
export async function catatAksesBukuManual(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id || req.body.bukuId;
    const bukuId = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!bukuId) {
      return res.status(400).json({
        success: false,
        error: 'ID buku wajib diberikan melalui URL parameter /buku/:id/baca atau field "bukuId" di body',
      });
    }

    const buku = await prisma.buku.findFirst({
      where: { id: bukuId, isDeleted: false },
      select: { id: true, judul: true, penulis: true, isActive: true },
    });

    if (!buku) {
      return res.status(404).json({
        success: false,
        error: 'Buku tidak ditemukan atau telah dihapus',
      });
    }

    // Pengecekan status buku nonaktif
    if (!buku.isActive) {
      const userRoles: string[] = (req as any).user?.roles || [];
      const isAdminOrStaff = userRoles.some((r) => ['ADMIN', 'PETUGAS'].includes(r.toUpperCase()));

      if (!isAdminOrStaff) {
        return res.status(403).json({
          success: false,
          error: 'Buku ini sedang dinonaktifkan sementara dan tidak dapat diakses untuk membaca.',
          status: 'NONAKTIF',
        });
      }
    }

    const log = await catatAksesBuku(buku.id, req);

    if (!log) {
      return res.status(500).json({
        success: false,
        error: 'Gagal mencatat log pembaca ke database',
      });
    }

    return res.status(201).json({
      success: true,
      message: `Akses pembaca untuk buku "${buku.judul}" berhasil dicatat`,
      data: {
        id: log.id,
        bukuId: log.bukuId,
        judulBuku: buku.judul,
        penulis: buku.penulis,
        diaksesPada: log.diaksesPada,
        tipePembaca: log.userId ? 'USER_TERDAFTAR' : 'TAMU_ANONIM',
        user: log.user || null,
      },
    });
  } catch (error: any) {
    console.error('Error catat log pembaca manual:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan server saat mencatat log pembaca',
      detail: error.message,
    });
  }
}

/**
 * Controller: Statistik Pembaca Buku Tertentu (Menjawab "Buku A dibaca berapa kali di tanggal X")
 * Endpoint: GET /buku/:id/statistik-pembaca
 * Query params yang didukung:
 * - tanggal: string YYYY-MM-DD (contoh: ?tanggal=2026-10-21) -> Menjawab spesifik di tanggal X
 * - startDate & endDate: string YYYY-MM-DD -> Statistik rentang tanggal
 * - (tanpa query tanggal): Menampilkan all-time total, hari ini, 7 hari terakhir, dan tren
 */
export async function getStatistikBukuPembaca(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id || req.query.bukuId;
    const bukuId = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!bukuId) {
      return res.status(400).json({
        success: false,
        error: 'ID buku wajib diberikan melalui URL parameter atau query param bukuId',
      });
    }

    const buku = await prisma.buku.findFirst({
      where: { id: bukuId, isDeleted: false },
      include: {
        kategori: true,
        jenisLiteratur: true,
      },
    });

    if (!buku) {
      return res.status(404).json({
        success: false,
        error: 'Buku tidak ditemukan',
      });
    }

    const tanggalQuery = typeof req.query.tanggal === 'string' ? req.query.tanggal.trim() : undefined;
    const startDateQuery = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : undefined;
    const endDateQuery = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : undefined;

    // ========================================================
    // KASUS 1: Query spesifik per tanggal X (?tanggal=YYYY-MM-DD)
    // Jawaban langsung untuk: "Buku A dibaca berapa kali di tanggal X"
    // ========================================================
    if (tanggalQuery) {
      const { tanggal, startDate, endDate } = parseDateRange(tanggalQuery);

      const logs = await prisma.logPembaca.findMany({
        where: {
          bukuId: buku.id,
          isDeleted: false,
          diaksesPada: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: { id: true, nama: true, email: true },
          },
        },
        orderBy: { diaksesPada: 'asc' },
      });

      const totalDibaca = logs.length;
      const userLoginLogs = logs.filter((l) => l.userId !== null);
      const guestLogs = logs.filter((l) => l.userId === null);
      const pembacaUserLogin = userLoginLogs.length;
      const pembacaTamu = guestLogs.length;

      // Hitung pembaca unik user login
      const uniqueUserMap = new Map<string, { id: string; nama: string; email: string; frekuensi: number }>();
      for (const l of userLoginLogs) {
        if (l.user) {
          const existing = uniqueUserMap.get(l.user.id);
          if (existing) {
            existing.frekuensi += 1;
          } else {
            uniqueUserMap.set(l.user.id, {
              id: l.user.id,
              nama: l.user.nama,
              email: l.user.email,
              frekuensi: 1,
            });
          }
        }
      }

      const jawaban = `Buku "${buku.judul}" dibaca sebanyak ${totalDibaca} kali pada tanggal ${tanggal} (${pembacaUserLogin} kali oleh anggota login, ${pembacaTamu} kali oleh tamu/anonim).`;

      return res.json({
        success: true,
        jawaban,
        data: {
          buku: {
            id: buku.id,
            judul: buku.judul,
            penulis: buku.penulis,
            penerbit: buku.penerbit,
            kategori: buku.kategori?.nama || null,
            jenisLiteratur: buku.jenisLiteratur?.nama || null,
            isActive: buku.isActive,
          },
          filter: {
            tanggal,
            zonaWaktu: 'Asia/Jakarta (WIB, UTC+7)',
            rentangWaktuUtc: {
              mulai: startDate.toISOString(),
              selesai: endDate.toISOString(),
            },
          },
          statistik: {
            totalDibaca,
            pembacaUserLogin,
            pembacaTamu,
            pembacaUnikUserLogin: uniqueUserMap.size,
          },
          daftarUserMembaca: Array.from(uniqueUserMap.values()),
          rincianLog: logs.map((l) => ({
            id: l.id,
            waktu: l.diaksesPada,
            tipe: l.userId ? 'USER_LOGIN' : 'TAMU',
            user: l.user || null,
          })),
        },
      });
    }

    // ========================================================
    // KASUS 2: Query rentang tanggal (?startDate=...&endDate=...)
    // ========================================================
    if (startDateQuery && endDateQuery) {
      const startRange = parseDateRange(startDateQuery);
      const endRange = parseDateRange(endDateQuery);

      if (startRange.startDate > endRange.endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate tidak boleh lebih besar dari endDate',
        });
      }

      const logs = await prisma.logPembaca.findMany({
        where: {
          bukuId: buku.id,
          isDeleted: false,
          diaksesPada: {
            gte: startRange.startDate,
            lte: endRange.endDate,
          },
        },
        include: {
          user: { select: { id: true, nama: true, email: true } },
        },
        orderBy: { diaksesPada: 'asc' },
      });

      // Agregasi per tanggal
      const perHariMap = new Map<string, { tanggal: string; total: number; userLogin: number; tamu: number }>();

      // Isi inisialisasi semua tanggal di rentang agar tidak bolong
      const curr = new Date(startRange.startDate);
      while (curr <= endRange.endDate) {
        const dateStr = formatToLocalDateString(curr);
        if (!perHariMap.has(dateStr)) {
          perHariMap.set(dateStr, { tanggal: dateStr, total: 0, userLogin: 0, tamu: 0 });
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      for (const l of logs) {
        const dateStr = formatToLocalDateString(l.diaksesPada);
        const item = perHariMap.get(dateStr) || { tanggal: dateStr, total: 0, userLogin: 0, tamu: 0 };
        item.total += 1;
        if (l.userId) {
          item.userLogin += 1;
        } else {
          item.tamu += 1;
        }
        perHariMap.set(dateStr, item);
      }

      const totalDibaca = logs.length;
      const totalUserLogin = logs.filter((l) => l.userId !== null).length;
      const totalTamu = logs.filter((l) => l.userId === null).length;

      return res.json({
        success: true,
        jawaban: `Buku "${buku.judul}" dibaca sebanyak ${totalDibaca} kali antara tanggal ${startDateQuery} sampai ${endDateQuery}.`,
        data: {
          buku: {
            id: buku.id,
            judul: buku.judul,
            penulis: buku.penulis,
          },
          rentangTanggal: {
            startDate: startDateQuery,
            endDate: endDateQuery,
          },
          totalDibaca,
          totalUserLogin,
          totalTamu,
          rincianHarian: Array.from(perHariMap.values()),
        },
      });
    }

    // ========================================================
    // KASUS 3: Tanpa filter tanggal (Ringkasan Keseluruhan Buku)
    // Menampilkan: all-time total, hari ini, 7 hari terakhir, 30 hari terakhir
    // ========================================================
    const now = new Date();
    const todayStr = formatToLocalDateString(now);
    const todayRange = parseDateRange(todayStr);

    const sevenDaysAgo = new Date(todayRange.startDate);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

    const thirtyDaysAgo = new Date(todayRange.startDate);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    const [totalSepanjangWaktu, totalHariIni, logsTujuhHari] = await Promise.all([
      prisma.logPembaca.count({
        where: { bukuId: buku.id, isDeleted: false },
      }),
      prisma.logPembaca.count({
        where: {
          bukuId: buku.id,
          isDeleted: false,
          diaksesPada: { gte: todayRange.startDate, lte: todayRange.endDate },
        },
      }),
      prisma.logPembaca.findMany({
        where: {
          bukuId: buku.id,
          isDeleted: false,
          diaksesPada: { gte: sevenDaysAgo, lte: todayRange.endDate },
        },
        select: { id: true, userId: true, diaksesPada: true },
        orderBy: { diaksesPada: 'asc' },
      }),
    ]);

    // Breakdown 7 hari terakhir
    const trend7HariMap = new Map<string, { tanggal: string; total: number; userLogin: number; tamu: number }>();
    const c = new Date(sevenDaysAgo);
    while (c <= todayRange.endDate) {
      const dStr = formatToLocalDateString(c);
      trend7HariMap.set(dStr, { tanggal: dStr, total: 0, userLogin: 0, tamu: 0 });
      c.setUTCDate(c.getUTCDate() + 1);
    }

    for (const l of logsTujuhHari) {
      const dStr = formatToLocalDateString(l.diaksesPada);
      const item = trend7HariMap.get(dStr);
      if (item) {
        item.total += 1;
        if (l.userId) item.userLogin += 1;
        else item.tamu += 1;
      }
    }

    return res.json({
      success: true,
      data: {
        buku: {
          id: buku.id,
          judul: buku.judul,
          penulis: buku.penulis,
          penerbit: buku.penerbit,
          kategori: buku.kategori?.nama || null,
        },
        ringkasan: {
          totalSepanjangWaktu,
          dibacaHariIni: {
            tanggal: todayStr,
            total: totalHariIni,
          },
          total7HariTerakhir: logsTujuhHari.length,
        },
        tren7HariTerakhir: Array.from(trend7HariMap.values()),
        petunjuk: 'Untuk melihat statistik pada tanggal spesifik X, gunakan query ?tanggal=YYYY-MM-DD (contoh: ?tanggal=2026-10-21)',
      },
    });
  } catch (error: any) {
    console.error('Error get statistik buku pembaca:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil statistik pembaca buku',
      detail: error.message,
    });
  }
}

/**
 * Controller: Statistik Global Pembaca Perpustakaan
 * Endpoint: GET /log-pembaca/statistik
 * Mendukung query:
 * - bukuId: jika diberikan, mengambil statistik buku tersebut
 * - tanggal: string YYYY-MM-DD -> Statistik seluruh perpus pada tanggal X + Top Buku di tanggal X
 * - startDate & endDate: statistik rentang waktu
 */
export async function getStatistikGlobalPembaca(req: Request, res: Response): Promise<any> {
  try {
    const bukuId = req.query.bukuId as string | undefined;
    if (bukuId) {
      return getStatistikBukuPembaca(req, res);
    }

    const tanggalQuery = typeof req.query.tanggal === 'string' ? req.query.tanggal.trim() : undefined;
    const startDateQuery = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : undefined;
    const endDateQuery = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : undefined;

    let filterGte: Date | undefined;
    let filterLte: Date | undefined;
    let labelPeriode: string;

    if (tanggalQuery) {
      const { tanggal, startDate, endDate } = parseDateRange(tanggalQuery);
      filterGte = startDate;
      filterLte = endDate;
      labelPeriode = `Tanggal ${tanggal}`;
    } else if (startDateQuery && endDateQuery) {
      const s = parseDateRange(startDateQuery);
      const e = parseDateRange(endDateQuery);
      filterGte = s.startDate;
      filterLte = e.endDate;
      labelPeriode = `Rentang ${startDateQuery} s/d ${endDateQuery}`;
    } else {
      // Default: hari ini
      const todayStr = formatToLocalDateString(new Date());
      const r = parseDateRange(todayStr);
      filterGte = r.startDate;
      filterLte = r.endDate;
      labelPeriode = `Hari ini (${todayStr})`;
    }

    const logs = await prisma.logPembaca.findMany({
      where: {
        isDeleted: false,
        diaksesPada: {
          gte: filterGte,
          lte: filterLte,
        },
      },
      include: {
        buku: {
          select: { id: true, judul: true, penulis: true, kategori: { select: { nama: true } } },
        },
      },
      orderBy: { diaksesPada: 'desc' },
    });

    const totalDibaca = logs.length;
    const totalUserLogin = logs.filter((l) => l.userId !== null).length;
    const totalTamu = logs.filter((l) => l.userId === null).length;

    // Agregasi buku terpopuler (Top Books) pada periode ini
    const bukuPopulerMap = new Map<string, {
      bukuId: string;
      judul: string;
      penulis: string;
      kategori: string | null;
      totalDibaca: number;
      userLogin: number;
      tamu: number;
    }>();

    for (const l of logs) {
      if (!l.buku) continue;
      const b = l.buku;
      const existing = bukuPopulerMap.get(b.id);
      if (existing) {
        existing.totalDibaca += 1;
        if (l.userId) existing.userLogin += 1;
        else existing.tamu += 1;
      } else {
        bukuPopulerMap.set(b.id, {
          bukuId: b.id,
          judul: b.judul,
          penulis: b.penulis,
          kategori: b.kategori?.nama || null,
          totalDibaca: 1,
          userLogin: l.userId ? 1 : 0,
          tamu: l.userId ? 0 : 1,
        });
      }
    }

    const daftarBukuPopuler = Array.from(bukuPopulerMap.values()).sort(
      (a, b) => b.totalDibaca - a.totalDibaca
    );

    return res.json({
      success: true,
      periode: labelPeriode,
      statistik: {
        totalDibaca,
        totalUserLogin,
        totalTamu,
        totalJudulBukuDiakses: bukuPopulerMap.size,
      },
      bukuTerpopuler: daftarBukuPopuler,
    });
  } catch (error: any) {
    console.error('Error get statistik global pembaca:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil statistik global pembaca',
      detail: error.message,
    });
  }
}

/**
 * Controller: Mendapatkan Daftar Log Pembaca Lengkap (Audit Trail)
 * Endpoint: GET /log-pembaca
 * Mendukung filter: bukuId, userId, tanggal, startDate, endDate, tipe ('all' | 'login' | 'guest')
 * dan pagination (page, limit).
 */
export async function getSemuaLogPembaca(req: Request, res: Response): Promise<any> {
  try {
    const bukuId = typeof req.query.bukuId === 'string' ? req.query.bukuId : undefined;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const tanggalQuery = typeof req.query.tanggal === 'string' ? req.query.tanggal.trim() : undefined;
    const startDateQuery = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : undefined;
    const endDateQuery = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : undefined;
    const tipe = typeof req.query.tipe === 'string' ? req.query.tipe.toLowerCase() : 'all';

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (bukuId) where.bukuId = bukuId;
    if (userId) where.userId = userId;

    if (tipe === 'login') {
      where.userId = { not: null };
    } else if (tipe === 'guest' || tipe === 'tamu') {
      where.userId = null;
    }

    if (tanggalQuery) {
      const { startDate, endDate } = parseDateRange(tanggalQuery);
      where.diaksesPada = { gte: startDate, lte: endDate };
    } else if (startDateQuery && endDateQuery) {
      const s = parseDateRange(startDateQuery);
      const e = parseDateRange(endDateQuery);
      where.diaksesPada = { gte: s.startDate, lte: e.endDate };
    }

    const [totalData, logs] = await Promise.all([
      prisma.logPembaca.count({ where }),
      prisma.logPembaca.findMany({
        where,
        include: {
          buku: {
            select: { id: true, judul: true, penulis: true, kategori: { select: { nama: true } } },
          },
          user: {
            select: { id: true, nama: true, email: true },
          },
        },
        orderBy: { diaksesPada: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return res.json({
      success: true,
      meta: {
        page,
        limit,
        totalData,
        totalPages: Math.ceil(totalData / limit),
      },
      data: logs.map((l) => ({
        id: l.id,
        diaksesPada: l.diaksesPada,
        buku: l.buku,
        tipePembaca: l.userId ? 'USER_LOGIN' : 'TAMU',
        user: l.user || null,
        createdBy: l.createdBy,
      })),
    });
  } catch (error: any) {
    console.error('Error get semua log pembaca:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil data log pembaca',
      detail: error.message,
    });
  }
}

/**
 * Controller: Riwayat Baca User Tertentu (Personal Reading History)
 * Endpoint: GET /users/:id/riwayat-baca atau GET /log-pembaca/saya
 */
export async function getRiwayatBacaUser(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id || (req as any).user?.userId;
    const targetUserId = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!targetUserId || targetUserId === 'dev-mode-user') {
      return res.status(400).json({
        success: false,
        error: 'ID user tidak valid atau Anda belum login dengan akun terdaftar',
      });
    }

    const user = await prisma.user.findFirst({
      where: { id: targetUserId, isDeleted: false },
      select: { id: true, nama: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User tidak ditemukan',
      });
    }

    const logs = await prisma.logPembaca.findMany({
      where: {
        userId: user.id,
        isDeleted: false,
      },
      include: {
        buku: {
          select: {
            id: true,
            judul: true,
            penulis: true,
            penerbit: true,
            kategori: { select: { nama: true } },
          },
        },
      },
      orderBy: { diaksesPada: 'desc' },
    });

    return res.json({
      success: true,
      user,
      totalBukuDibaca: logs.length,
      data: logs.map((l) => ({
        id: l.id,
        diaksesPada: l.diaksesPada,
        buku: l.buku,
      })),
    });
  } catch (error: any) {
    console.error('Error get riwayat baca user:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil riwayat baca user',
      detail: error.message,
    });
  }
}
