import express from 'express';
import {
    getStudentBookProgress,
    toggleBookProgress,
} from '../controllers/studentProgress.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';

const router = express.Router();

router.use(verifyToken, verifyCsrfToken);

router.get('/book-progress/:studentId/:subject', getStudentBookProgress);
router.post('/book-progress/toggle', toggleBookProgress);

export default router;
