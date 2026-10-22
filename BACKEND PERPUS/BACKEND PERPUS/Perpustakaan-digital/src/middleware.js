"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.khususAdmin = exports.cekRole = exports.verifikasiToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
/**
 * Middleware untuk verifikasi JWT Token
 */
const verifikasiToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;
    if (!token) {
        // Mode fleksibel untuk kemudahan testing lokal: jika tidak mengirim token, set user default ADMIN
        req.user = {
            userId: 'dev-mode-user',
            roles: ['ADMIN', 'ANGGOTA'],
        };
        return next();
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Format roles selalu berupa array string
        let roles = [];
        if (Array.isArray(decoded.roles)) {
            roles = decoded.roles.map((r) => r.toUpperCase());
        }
        else if (typeof decoded.role === 'string') {
            roles = [decoded.role.toUpperCase()];
        }
        req.user = {
            ...decoded,
            roles,
        };
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Token otentikasi tidak valid atau telah kedaluwarsa',
        });
    }
};
exports.verifikasiToken = verifikasiToken;
/**
 * Middleware untuk memeriksa apakah user memiliki salah satu dari role yang diizinkan (Many-to-Many Role Check)
 */
const cekRole = (...allowedRoles) => {
    return (req, res, next) => {
        const userRoles = req.user?.roles || [];
        const upperAllowed = allowedRoles.map((r) => r.toUpperCase());
        const hasPermission = userRoles.some((role) => upperAllowed.includes(role));
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                error: `Akses ditolak! Anda membutuhkan salah satu role berikut: ${allowedRoles.join(', ')}`,
                userRoles,
            });
        }
        next();
    };
};
exports.cekRole = cekRole;
/**
 * Shortcut middleware untuk akses khusus role ADMIN
 */
exports.khususAdmin = (0, exports.cekRole)('ADMIN');
