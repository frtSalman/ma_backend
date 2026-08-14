const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const verifyCsrfToken = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const csrfCookie = req.cookies?.['XSRF-TOKEN'];
    const csrfHeader = req.get('x-csrf-token') || req.get('x-xsrf-token') || '';

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({
            success: false,
            message: 'CSRF doğrulaması başarısız. Lütfen sayfayı yenileyin.',
        });
    }

    next();
};
