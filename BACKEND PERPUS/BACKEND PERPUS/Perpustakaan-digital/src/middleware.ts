import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET ?? '';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET wajib diatur sebelum backend dijalankan.');
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    roles: string[];
    [key: string]: any;
  };
}

/**
 * Middleware untuk verifikasi JWT Token
 */
export const verifikasiToken = (req: AuthRequest, res: Response, next: NextFunction): any => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token autentikasi wajib disertakan',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // Format roles selalu berupa array string
    let roles: string[] = [];
    if (Array.isArray(decoded.roles)) {
      roles = decoded.roles.map((r: string) => r.toUpperCase());
    } else if (typeof decoded.role === 'string') {
      roles = [decoded.role.toUpperCase()];
    }

    req.user = {
      ...decoded,
      roles,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token otentikasi tidak valid atau telah kedaluwarsa',
    });
  }
};

/**
 * Middleware untuk verifikasi JWT Token opsional (publik / fleksibel).
 * - Jika mengirim Bearer token valid: req.user diset dengan payload JWT.
 * - Jika tidak mengirim token: req.user = undefined (tetap lanjut sebagai tamu/guest).
 * - Jika token dikirim tetapi tidak valid / expired: mengembalikan error 401.
 */
export const verifikasiTokenOpsional = (req: AuthRequest, res: Response, next: NextFunction): any => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    req.user = undefined;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    let roles: string[] = [];
    if (Array.isArray(decoded.roles)) {
      roles = decoded.roles.map((r: string) => r.toUpperCase());
    } else if (typeof decoded.role === 'string') {
      roles = [decoded.role.toUpperCase()];
    }

    req.user = {
      ...decoded,
      roles,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token otentikasi tidak valid atau telah kedaluwarsa',
    });
  }
};

/**
 * Middleware untuk memeriksa apakah user memiliki salah satu dari role yang diizinkan (Many-to-Many Role Check)
 */
export const cekRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
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

/**
 * Shortcut middleware untuk akses khusus role ADMIN
 */
export const khususAdmin = cekRole('ADMIN');