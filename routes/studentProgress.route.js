import express from 'express';
import {
    getStudentBookProgress,
    toggleBookProgress,
} from '../controllers/studentProgress.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Route'ları koruma altına alıyoruz
router.get(
    '/book-progress/:studentId/:subject',
    verifyToken,
    getStudentBookProgress
);
router.post('/book-progress/toggle', verifyToken, toggleBookProgress);

export default router;
