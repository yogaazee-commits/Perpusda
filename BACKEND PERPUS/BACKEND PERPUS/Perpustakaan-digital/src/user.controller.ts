import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET ?? '';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET wajib diatur sebelum backend dijalankan.');
}

/**
 * Registrasi User Baru dengan dukungan Multiple Roles (Many-to-Many via pivot user_roles)
 */
export async function registerUser(req: Request, res: Response): Promise<any> {
  try {
    const { nama, email, password } = req.body || {};

    if (!nama || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nama, email, dan password wajib diisi!',
      });
    }

    const normalizedEmail = String(email).trim().toLocaleLowerCase('id');
    const userExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'Email sudah digunakan oleh user lain!',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const roleNames = ['ANGGOTA'];

    const creatorId = (req as any).user?.userId || null;

    // Temukan atau buat role di tabel Role
    const roleRecords = await Promise.all(
      roleNames.map(async (namaRole) => {
        let role = await prisma.role.findUnique({ where: { nama: namaRole } });
        if (!role) {
          role = await prisma.role.create({
            data: {
              nama: namaRole,
              createdBy: creatorId,
            },
          });
        }
        return role;
      })
    );

    // Filter null values secara type-safe
    const validRoles = roleRecords.filter((r): r is NonNullable<typeof r> => Boolean(r));

    // Buat user sekaligus menghubungkan ke pivot table user_roles
    const newUser = await prisma.user.create({
      data: {
        nama,
        email: normalizedEmail,
        password: hashedPassword,
        createdBy: creatorId,
        userRoles: {
          create: validRoles.map((r) => ({
            roleId: r.id,
            createdBy: creatorId,
          })),
        },
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    const assignedRoles = newUser.userRoles.map((ur) => ur.role.nama);

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      user: {
        id: newUser.id,
        nama: newUser.nama,
        email: newUser.email,
        roles: assignedRoles,
      },
    });
  } catch (error: any) {
    console.error('Error register:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan pada server saat registrasi',
      detail: error.message,
    });
  }
}

/**
 * Login User dengan menyertakan semua role dalam JWT Token
 */
export async function loginUser(req: Request, res: Response): Promise<any> {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email dan password wajib diisi!',
      });
    }

    const identity = String(email).trim();
    const user = await prisma.user.findFirst({
      where: {
        isDeleted: false,
        OR: [
          { email: identity.toLocaleLowerCase('id') },
          { nama: identity },
        ],
      },
      include: {
        userRoles: {
          where: { isDeleted: false },
          include: { role: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User dengan email tersebut tidak ditemukan',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Password yang dimasukkan salah',
      });
    }

    // Ambil seluruh daftar role yang dimiliki user
    const roles = user.userRoles.map((ur) => ur.role.nama);
    if (roles.length === 0) {
      roles.push('ANGGOTA');
    }

    // Sign JWT dengan payload seluruh role
    const token = jwt.sign(
      {
        userId: user.id,
        nama: user.nama,
        email: user.email,
        roles,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        roles,
      },
    });
  } catch (error: any) {
    console.error('Error login:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan pada server saat login',
      detail: error.message,
    });
  }
}

/**
 * Menambahkan role ke user (Many-to-Many Pivot Table user_roles)
 */
export async function tambahRoleKeUser(req: Request, res: Response): Promise<any> {
  try {
    const rawUserId = req.params.id;
    const userId = (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId) as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID user tidak valid',
      });
    }

    const { role, roles } = req.body || {};

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User tidak ditemukan',
      });
    }

    let inputRoles: string[] = [];
    if (Array.isArray(roles) && roles.length > 0) {
      inputRoles = roles.map((r: any) => String(r).toUpperCase().trim());
    } else if (typeof role === 'string' && role.trim() !== '') {
      inputRoles = [role.toUpperCase().trim()];
    }

    if (inputRoles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Wajib menyertakan nama role yang ingin ditambahkan (field "role" atau "roles")!',
      });
    }

    const creatorId = (req as any).user?.userId || null;

    // Temukan atau buat role di tabel Role, lalu masukkan ke pivot table user_roles
    for (const namaRole of inputRoles) {
      let roleRecord = await prisma.role.findUnique({ where: { nama: namaRole } });
      if (!roleRecord) {
        roleRecord = await prisma.role.create({
          data: {
            nama: namaRole,
            createdBy: creatorId,
          },
        });
      }

      if (!roleRecord) continue;

      // Cek apakah relasi sudah ada di pivot user_roles
      const existingPivot = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: roleRecord.id,
          },
        },
      });

      if (!existingPivot) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: roleRecord.id,
            createdBy: creatorId,
          },
        });
      } else if (existingPivot.isDeleted) {
        await prisma.userRole.update({
          where: { id: existingPivot.id },
          data: {
            isDeleted: false,
            updatedBy: creatorId,
          },
        });
      }
    }

    // Ambil daftar role terbaru yang aktif (isDeleted: false)
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { isDeleted: false },
          include: { role: true },
        },
      },
    });

    const allRoles = updatedUser?.userRoles.map((ur) => ur.role.nama) || [];

    return res.json({
      success: true,
      message: `Role berhasil ditambahkan ke user ${user.nama}`,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        roles: allRoles,
      },
    });
  } catch (error: any) {
    console.error('Error tambah role user:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal menambahkan role ke user',
      detail: error.message,
    });
  }
}

/**
 * Menghapus role tertentu dari user (Soft delete pada pivot table user_roles)
 */
export async function hapusRoleDariUser(req: Request, res: Response): Promise<any> {
  try {
    const rawUserId = req.params.id;
    const userId = (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId) as string;

    const rawRoleParam = req.params.roleParam || req.params.roleId || req.params.roleName;
    const roleParam = (Array.isArray(rawRoleParam) ? rawRoleParam[0] : rawRoleParam) as string;

    if (!userId || !roleParam) {
      return res.status(400).json({
        success: false,
        error: 'Parameter ID user dan nama role / role ID wajib disertakan di URL!',
      });
    }

    const user = await prisma.user.findFirst({ where: { id: userId, isDeleted: false } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User tidak ditemukan',
      });
    }

    // Cari role berdasarkan ID atau Nama
    const roleRecord = await prisma.role.findFirst({
      where: {
        isDeleted: false,
        OR: [
          { id: roleParam },
          { nama: roleParam.toUpperCase() },
        ],
      },
    });

    if (!roleRecord) {
      return res.status(404).json({
        success: false,
        error: `Role "${roleParam}" tidak ditemukan`,
      });
    }

    // Soft delete dari pivot table user_roles
    await prisma.userRole.updateMany({
      where: {
        userId: user.id,
        roleId: roleRecord.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        updatedBy: (req as any).user?.userId || null,
      },
    });

    // Ambil sisa role aktif yang dimiliki user
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { isDeleted: false },
          include: { role: true },
        },
      },
    });

    const sisaRoles = updatedUser?.userRoles.map((ur) => ur.role.nama) || [];

    return res.json({
      success: true,
      message: `Role "${roleRecord.nama}" berhasil dihapus dari user ${user.nama}`,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        roles: sisaRoles,
      },
    });
  } catch (error: any) {
    console.error('Error hapus role user:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal menghapus role dari user',
      detail: error.message,
    });
  }
}

/**
 * Mendapatkan semua user beserta role masing-masing (hanya user aktif & role aktif)
 */
export async function getSemuaUser(req: Request, res: Response): Promise<any> {
  try {
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        nama: true,
        email: true,
        createdAt: true,
        userRoles: {
          where: { isDeleted: false },
          include: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      nama: u.nama,
      email: u.email,
      createdAt: u.createdAt,
      roles: u.userRoles.map((ur) => ur.role.nama),
    }));

    return res.json({
      success: true,
      total: formattedUsers.length,
      data: formattedUsers,
    });
  } catch (error: any) {
    console.error('Error get users:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil data user',
      detail: error.message,
    });
  }
}

/**
 * Mendapatkan daftar role milik user tertentu
 */
export async function getRolesByUser(req: Request, res: Response): Promise<any> {
  try {
    const rawUserId = req.params.id;
    const userId = (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId) as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID user tidak valid',
      });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      include: {
        userRoles: {
          where: { isDeleted: false },
          include: { role: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User tidak ditemukan',
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        roles: user.userRoles.map((ur) => ({
          id: ur.role.id,
          nama: ur.role.nama,
          assignedAt: ur.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error get roles by user:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil role user',
      detail: error.message,
    });
  }
}

/**
 * Mendapatkan semua daftar role yang terdaftar di sistem
 */
export async function getSemuaRole(req: Request, res: Response): Promise<any> {
  try {
    const roles = await prisma.role.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: {
            userRoles: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: { nama: 'asc' },
    });

    return res.json({
      success: true,
      total: roles.length,
      data: roles.map((r: any) => ({
        id: r.id,
        nama: r.nama,
        totalUsers: r._count?.userRoles ?? 0,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error get roles:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil daftar role',
      detail: error.message,
    });
  }
}

/**
 * Menambahkan master role baru ke sistem
 */
export async function tambahRole(req: Request, res: Response): Promise<any> {
  try {
    const { nama } = req.body || {};
    if (!nama || typeof nama !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Nama role wajib diisi (string)!',
      });
    }

    const namaRole = nama.toUpperCase().trim();
    const existing = await prisma.role.findUnique({ where: { nama: namaRole } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Role "${namaRole}" sudah ada di sistem!`,
      });
    }

    const creatorId = (req as any).user?.userId || null;
    const roleBaru = await prisma.role.create({
      data: {
        nama: namaRole,
        createdBy: creatorId,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Role "${namaRole}" berhasil dibuat`,
      data: roleBaru,
    });
  } catch (error: any) {
    console.error('Error tambah role:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal membuat role baru',
      detail: error.message,
    });
  }
}

/**
 * Mendapatkan detail user berdasarkan ID (Read One)
 */
export async function getUserById(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID user tidak valid' });
    }

    const user = await prisma.user.findFirst({
      where: { id, isDeleted: false },
      include: {
        userRoles: {
          where: { isDeleted: false },
          include: { role: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        roles: user.userRoles.map((ur) => ur.role.nama),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error get detail user:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil detail user', detail: error.message });
  }
}

/**
 * Memperbarui data user (Update User: nama, email, password, roles)
 */
export async function updateUser(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID user tidak valid' });
    }

    const user = await prisma.user.findFirst({ where: { id, isDeleted: false } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }

    const { nama, email, password, roles } = req.body || {};
    const updaterId = (req as any).user?.userId || null;

    let updateData: any = {
      updatedBy: updaterId,
    };

    if (nama) updateData.nama = String(nama).trim();

    if (email && email !== user.email) {
      const emailExists = await prisma.user.findFirst({
        where: { email: String(email).trim(), id: { not: id }, isDeleted: false },
      });
      if (emailExists) {
        return res.status(400).json({ success: false, error: 'Email tersebut sudah digunakan oleh user lain' });
      }
      updateData.email = String(email).trim();
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Jika roles diperbarui, sinkronkan pivot user_roles
    if (Array.isArray(roles)) {
      // Nonaktifkan semua role user saat ini
      await prisma.userRole.updateMany({
        where: { userId: id, isDeleted: false },
        data: { isDeleted: true, updatedBy: updaterId },
      });

      // Aktifkan kembali atau buat role baru
      for (const r of roles) {
        const namaRole = String(r).toUpperCase().trim();
        let roleRecord = await prisma.role.findFirst({ where: { nama: namaRole, isDeleted: false } });
        if (!roleRecord) {
          roleRecord = await prisma.role.create({
            data: { nama: namaRole, createdBy: updaterId },
          });
        }

        const existingPivot = await prisma.userRole.findUnique({
          where: { userId_roleId: { userId: id, roleId: roleRecord.id } },
        });

        if (existingPivot) {
          await prisma.userRole.update({
            where: { id: existingPivot.id },
            data: { isDeleted: false, updatedBy: updaterId },
          });
        } else {
          await prisma.userRole.create({
            data: { userId: id, roleId: roleRecord.id, createdBy: updaterId },
          });
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        userRoles: {
          where: { isDeleted: false },
          include: { role: true },
        },
      },
    });

    return res.json({
      success: true,
      message: `Data user "${updatedUser.nama}" berhasil diperbarui`,
      data: {
        id: updatedUser.id,
        nama: updatedUser.nama,
        email: updatedUser.email,
        roles: updatedUser.userRoles.map((ur) => ur.role.nama),
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error update user:', error);
    return res.status(500).json({ success: false, error: 'Gagal memperbarui data user', detail: error.message });
  }
}

/**
 * Menghapus user (Soft Delete User)
 */
export async function hapusUser(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID user tidak valid' });
    }

    const user = await prisma.user.findFirst({ where: { id, isDeleted: false } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }

    const updaterId = (req as any).user?.userId || null;

    // Soft delete user
    await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: updaterId,
      },
    });

    // Soft delete user_roles terkait
    await prisma.userRole.updateMany({
      where: { userId: id, isDeleted: false },
      data: {
        isDeleted: true,
        updatedBy: updaterId,
      },
    });

    return res.json({
      success: true,
      message: `User "${user.nama}" (${user.email}) berhasil dihapus (soft delete)`,
    });
  } catch (error: any) {
    console.error('Error hapus user:', error);
    return res.status(500).json({ success: false, error: 'Gagal menghapus user', detail: error.message });
  }
}

/**
 * Mendapatkan detail role berdasarkan ID (Read One Role)
 */
export async function getRoleById(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const role = await prisma.role.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: {
          select: { userRoles: { where: { isDeleted: false } } },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ success: false, error: 'Role tidak ditemukan' });
    }

    return res.json({
      success: true,
      data: {
        id: role.id,
        nama: role.nama,
        totalUsers: (role as any)._count?.userRoles ?? 0,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error get role by id:', error);
    return res.status(500).json({ success: false, error: 'Gagal mengambil detail role', detail: error.message });
  }
}

/**
 * Memperbarui nama role (Update Role)
 */
export async function updateRole(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;
    const { nama } = req.body || {};

    if (!nama || typeof nama !== 'string') {
      return res.status(400).json({ success: false, error: 'Nama role baru wajib diisi!' });
    }

    const namaRole = nama.toUpperCase().trim();
    const role = await prisma.role.findFirst({ where: { id, isDeleted: false } });
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role tidak ditemukan' });
    }

    const existing = await prisma.role.findFirst({
      where: { nama: namaRole, id: { not: id }, isDeleted: false },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: `Role dengan nama "${namaRole}" sudah ada!` });
    }

    const updaterId = (req as any).user?.userId || null;
    const updated = await prisma.role.update({
      where: { id },
      data: {
        nama: namaRole,
        updatedBy: updaterId,
      },
    });

    return res.json({
      success: true,
      message: `Role berhasil diperbarui menjadi "${updated.nama}"`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error update role:', error);
    return res.status(500).json({ success: false, error: 'Gagal memperbarui role', detail: error.message });
  }
}

/**
 * Menghapus role (Soft Delete Role)
 */
export async function hapusRole(req: Request, res: Response): Promise<any> {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    const role = await prisma.role.findFirst({ where: { id, isDeleted: false } });
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role tidak ditemukan' });
    }

    const updaterId = (req as any).user?.userId || null;

    await prisma.role.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: updaterId,
      },
    });

    // Soft delete penugasan role ini di user_roles
    await prisma.userRole.updateMany({
      where: { roleId: id, isDeleted: false },
      data: {
        isDeleted: true,
        updatedBy: updaterId,
      },
    });

    return res.json({
      success: true,
      message: `Role "${role.nama}" berhasil dihapus`,
    });
  } catch (error: any) {
    console.error('Error hapus role:', error);
    return res.status(500).json({ success: false, error: 'Gagal menghapus role', detail: error.message });
  }
}
