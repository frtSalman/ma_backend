import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateCSRFToken = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET_KEY, {
        expiresIn: '7d',
    });

    const csrfToken = crypto.randomBytes(32).toString('hex');

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        // ÖNEMLİ
        ...(isProd && {
            domain: '.teachflow.net',
        }),
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return token;
};
