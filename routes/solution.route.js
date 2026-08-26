import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';
import {
    getSolution,
    postSolution,
} from '../controllers/solution.controller.js';
import multer from 'multer';
import { verifyPayment } from '../middlewares/verifyPayment.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken, verifyCsrfToken);

router.post(
    '/post-solution',
    verifyPayment,
    upload.single('file'),
    postSolution
);

router.get('/:qId', getSolution);

export default router;
