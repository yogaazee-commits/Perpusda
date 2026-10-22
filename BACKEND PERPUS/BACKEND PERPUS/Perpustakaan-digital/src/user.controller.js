"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.tambahRoleKeUser = tambahRoleKeUser;
exports.hapusRoleDariUser = hapusRoleDariUser;
exports.getSemuaUser = getSemuaUser;
exports.getRolesByUser = getRolesByUser;
exports.getSemuaRole = getSemuaRole;
exports.tambahRole = tambahRole;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.hapusUser = hapusUser;
exports.getRoleById = getRoleById;
exports.updateRole = updateRole;
exports.hapusRole = hapusRole;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("./prisma"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
/**
 * Registrasi User Baru dengan dukungan Multiple Roles (Many-to-Many via pivot user_roles)
 */
async function registerUser(req, res) {
    try {
        const { nama, email, password, roles } = req.body || {};
        if (!nama || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Nama, email, dan password wajib diisi!',
            });
        }
        const userExists = await prisma_1.default.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({
                success: false,
                error: 'Email sudah digunakan oleh user lain!',
            });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Default role jika tidak ditentukan: ['ANGGOTA']
        let roleNames = ['ANGGOTA'];
        if (Array.isArray(roles) && roles.length > 0) {
            roleNames = roles.map((r) => String(r).toUpperCase().trim());
        }
        else if (typeof roles === 'string' && roles.trim() !== '') {
            roleNames = [roles.toUpperCase().trim()];
        }
        const creatorId = req.user?.userId || null;
        // Temukan atau buat role di tabel Role
        const roleRecords = await Promise.all(roleNames.map(async (namaRole) => {
            let role = await prisma_1.default.role.findUnique({ where: { nama: namaRole } });
            if (!role) {
                role = await prisma_1.default.role.create({
                    data: {
                        nama: namaRole,
                        createdBy: creatorId,
                    },
                });
            }
            return role;
        }));
        // Filter null values secara type-safe
        const validRoles = roleRecords.filter((r) => Boolean(r));
        // Buat user sekaligus menghubungkan ke pivot table user_roles
        const newUser = await prisma_1.default.user.create({
            data: {
                nama,
                email,
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
    }
    catch (error) {
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
async function loginUser(req, res) {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email dan password wajib diisi!',
            });
        }
        const user = await prisma_1.default.user.findFirst({
            where: { email, isDeleted: false },
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
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
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
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            nama: user.nama,
            email: user.email,
            roles,
        }, JWT_SECRET, { expiresIn: '1d' });
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
    }
    catch (error) {
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
async function tambahRoleKeUser(req, res) {
    try {
        const rawUserId = req.params.id;
        const userId = (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'ID user tidak valid',
            });
        }
        const { role, roles } = req.body || {};
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User tidak ditemukan',
            });
        }
        let inputRoles = [];
        if (Array.isArray(roles) && roles.length > 0) {
            inputRoles = roles.map((r) => String(r).toUpperCase().trim());
        }
        else if (typeof role === 'string' && role.trim() !== '') {
            inputRoles = [role.toUpperCase().trim()];
        }
        if (inputRoles.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Wajib menyertakan nama role yang ingin ditambahkan (field "role" atau "roles")!',
            });
        }
        const creatorId = req.user?.userId || null;
        // Temukan atau buat role di tabel Role, lalu masukkan ke pivot table user_roles
        for (const namaRole of inputRoles) {
            let roleRecord = await prisma_1.default.role.findUnique({ where: { nama: namaRole } });
            if (!roleRecord) {
                roleRecord = await prisma_1.default.role.create({
                    data: {
                        nama: namaRole,
                        createdBy: creatorId,
                    },
                });
            }
            if (!roleRecord)
                continue;
            // Cek apakah relasi sudah ada di pivot user_roles
            const existingPivot = await prisma_1.default.userRole.findUnique({
                where: {
                    userId_roleId: {
                        userId: user.id,
                        roleId: roleRecord.id,
                    },
                },
            });
            if (!existingPivot) {
                await prisma_1.default.userRole.create({
                    data: {
                        userId: user.id,
                        roleId: roleRecord.id,
                        createdBy: creatorId,
                    },
                });
            }
            else if (existingPivot.isDeleted) {
                await prisma_1.default.userRole.update({
                    where: { id: existingPivot.id },
                    data: {
                        isDeleted: false,
                        updatedBy: creatorId,
                    },
                });
            }
        }
        // Ambil daftar role terbaru yang aktif (isDeleted: false)
        const updatedUser = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
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
async function hapusRoleDariUser(req, res) {
    try {
        const rawUserId = req.params.id;
        const userId = (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId);
        const rawRoleParam = req.params.roleParam || req.params.roleId || req.params.roleName;
        const roleParam = (Array.isArray(rawRoleParam) ? rawRoleParam[0] : rawRoleParam);
        if (!userId || !roleParam) {
            return res.status(400).json({
                success: false,
                error: 'Parameter ID user dan nama role / role ID wajib disertakan di URL!',
            });
        }
        const user = await prisma_1.default.user.findFirst({ where: { id: userId, isDeleted: false } });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User tidak ditemukan',
            });
        }
        // Cari role berdasarkan ID atau Nama
        const roleRecord = await prisma_1.default.role.findFirst({
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
        await prisma_1.default.userRole.updateMany({
            where: {
                userId: user.id,
                roleId: roleRecord.id,
                isDeleted: false,
            },
            data: {
                isDeleted: true,
                updatedBy: req.user?.userId || null,
            },
        });
        // Ambil sisa role aktif yang dimiliki user
        const updatedUser = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
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
async function getSemuaUser(req, res) {
    try {
        const users = await prisma_1.default.user.findMany({
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
    }
    catch (error) {
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
async function getRolesByUser(req, res) {
    try {
        const rawUserId = req.params.id;
        const userId = (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'ID user tidak valid',
            });
        }
        const user = await prisma_1.default.user.findFirst({
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
    }
    catch (error) {
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
async function getSemuaRole(req, res) {
    try {
        const roles = await prisma_1.default.role.findMany({
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
            data: roles.map((r) => ({
                id: r.id,
                nama: r.nama,
                totalUsers: r._count?.userRoles ?? 0,
                createdAt: r.createdAt,
            })),
        });
    }
    catch (error) {
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
async function tambahRole(req, res) {
    try {
        const { nama } = req.body || {};
        if (!nama || typeof nama !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Nama role wajib diisi (string)!',
            });
        }
        const namaRole = nama.toUpperCase().trim();
        const existing = await prisma_1.default.role.findUnique({ where: { nama: namaRole } });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: `Role "${namaRole}" sudah ada di sistem!`,
            });
        }
        const creatorId = req.user?.userId || null;
        const roleBaru = await prisma_1.default.role.create({
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
    }
    catch (error) {
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
async function getUserById(req, res) {
    try {
        const rawId = req.params.id;
        const id = (Array.isArray(rawId) ? rawId[0] : rawId);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID user tidak valid' });
        }
        const user = await prisma_1.default.user.findFirst({
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
    }
    catch (error) {
        console.error('Error get detail user:', error);
        return res.status(500).json({ success: false, error: 'Gagal mengambil detail user', detail: error.message });
    }
}
/**
 * Memperbarui data user (Update User: nama, email, password, roles)
 */
async function updateUser(req, res) {
    try {
        const rawId = req.params.id;
        const id = (Array.isArray(rawId) ? rawId[0] : rawId);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID user tidak valid' });
        }
        const user = await prisma_1.default.user.findFirst({ where: { id, isDeleted: false } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
        }
        const { nama, email, password, roles } = req.body || {};
        const updaterId = req.user?.userId || null;
        let updateData = {
            updatedBy: updaterId,
        };
        if (nama)
            updateData.nama = String(nama).trim();
        if (email && email !== user.email) {
            const emailExists = await prisma_1.default.user.findFirst({
                where: { email: String(email).trim(), id: { not: id }, isDeleted: false },
            });
            if (emailExists) {
                return res.status(400).json({ success: false, error: 'Email tersebut sudah digunakan oleh user lain' });
            }
            updateData.email = String(email).trim();
        }
        if (password) {
            const salt = await bcryptjs_1.default.genSalt(10);
            updateData.password = await bcryptjs_1.default.hash(password, salt);
        }
        // Jika roles diperbarui, sinkronkan pivot user_roles
        if (Array.isArray(roles)) {
            // Nonaktifkan semua role user saat ini
            await prisma_1.default.userRole.updateMany({
                where: { userId: id, isDeleted: false },
                data: { isDeleted: true, updatedBy: updaterId },
            });
            // Aktifkan kembali atau buat role baru
            for (const r of roles) {
                const namaRole = String(r).toUpperCase().trim();
                let roleRecord = await prisma_1.default.role.findFirst({ where: { nama: namaRole, isDeleted: false } });
                if (!roleRecord) {
                    roleRecord = await prisma_1.default.role.create({
                        data: { nama: namaRole, createdBy: updaterId },
                    });
                }
                const existingPivot = await prisma_1.default.userRole.findUnique({
                    where: { userId_roleId: { userId: id, roleId: roleRecord.id } },
                });
                if (existingPivot) {
                    await prisma_1.default.userRole.update({
                        where: { id: existingPivot.id },
                        data: { isDeleted: false, updatedBy: updaterId },
                    });
                }
                else {
                    await prisma_1.default.userRole.create({
                        data: { userId: id, roleId: roleRecord.id, createdBy: updaterId },
                    });
                }
            }
        }
        const updatedUser = await prisma_1.default.user.update({
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
    }
    catch (error) {
        console.error('Error update user:', error);
        return res.status(500).json({ success: false, error: 'Gagal memperbarui data user', detail: error.message });
    }
}
/**
 * Menghapus user (Soft Delete User)
 */
async function hapusUser(req, res) {
    try {
        const rawId = req.params.id;
        const id = (Array.isArray(rawId) ? rawId[0] : rawId);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID user tidak valid' });
        }
        const user = await prisma_1.default.user.findFirst({ where: { id, isDeleted: false } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
        }
        const updaterId = req.user?.userId || null;
        // Soft delete user
        await prisma_1.default.user.update({
            where: { id },
            data: {
                isDeleted: true,
                updatedBy: updaterId,
            },
        });
        // Soft delete user_roles terkait
        await prisma_1.default.userRole.updateMany({
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
    }
    catch (error) {
        console.error('Error hapus user:', error);
        return res.status(500).json({ success: false, error: 'Gagal menghapus user', detail: error.message });
    }
}
/**
 * Mendapatkan detail role berdasarkan ID (Read One Role)
 */
async function getRoleById(req, res) {
    try {
        const rawId = req.params.id;
        const id = (Array.isArray(rawId) ? rawId[0] : rawId);
        const role = await prisma_1.default.role.findFirst({
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
                totalUsers: role._count?.userRoles ?? 0,
                createdAt: role.createdAt,
                updatedAt: role.updatedAt,
            },
        });
    }
    catch (error) {
        console.error('Error get role by id:', error);
        return res.status(500).json({ success: false, error: 'Gagal mengambil detail role', detail: error.message });
    }
}
/**
 * Memperbarui nama role (Update Role)
 */
async function updateRole(req, res) {
    try {
        const rawId = req.params.id;
        const id = (Array.isArray(rawId) ? rawId[0] : rawId);
        const { nama } = req.body || {};
        if (!nama || typeof nama !== 'string') {
            return res.status(400).json({ success: false, error: 'Nama role baru wajib diisi!' });
        }
        const namaRole = nama.toUpperCase().trim();
        const role = await prisma_1.default.role.findFirst({ where: { id, isDeleted: false } });
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role tidak ditemukan' });
        }
        const existing = await prisma_1.default.role.findFirst({
            where: { nama: namaRole, id: { not: id }, isDeleted: false },
        });
        if (existing) {
            return res.status(400).json({ success: false, error: `Role dengan nama "${namaRole}" sudah ada!` });
        }
        const updaterId = req.user?.userId || null;
        const updated = await prisma_1.default.role.update({
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
    }
    catch (error) {
        console.error('Error update role:', error);
        return res.status(500).json({ success: false, error: 'Gagal memperbarui role', detail: error.message });
    }
}
/**
 * Menghapus role (Soft Delete Role)
 */
async function hapusRole(req, res) {
    try {
        const rawId = req.params.id;
        const id = (Array.isArray(rawId) ? rawId[0] : rawId);
        const role = await prisma_1.default.role.findFirst({ where: { id, isDeleted: false } });
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role tidak ditemukan' });
        }
        const updaterId = req.user?.userId || null;
        await prisma_1.default.role.update({
            where: { id },
            data: {
                isDeleted: true,
                updatedBy: updaterId,
            },
        });
        // Soft delete penugasan role ini di user_roles
        await prisma_1.default.userRole.updateMany({
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
    }
    catch (error) {
        console.error('Error hapus role:', error);
        return res.status(500).json({ success: false, error: 'Gagal menghapus role', detail: error.message });
    }
}
