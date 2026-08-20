import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
    complete3DSPayment,
    initializePayment,
} from '../controllers/payment.controller.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';

const router = express.Router();

router.post('/initialize', verifyToken, initializePayment); // 3DS ödeme başlatır.

router.post('/3ds-callback', complete3DSPayment); // 3DS doğrulama sonrası ödemeyi tamamlar.

export default router;
