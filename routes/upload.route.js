import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';
import {
    uploadUQ,
    deleteUQURL,
    getUQURL,
    updateUQAppearance,
    createTestPDF,
    deleteAllUQURL,
} from '../controllers/unsolvedQustion.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken, verifyCsrfToken);

router.post('/add-unsolved-question-path', upload.array('files'), uploadUQ);

router.put('/update-unsolved-question-view', updateUQAppearance);

router.get('/get-unsolved-question-path', getUQURL);

router.post('/delete-unsolved-question-path/:path', deleteUQURL);

router.post(
    '/delete-all-unsolved-questions/:studentId/:studentName',
    deleteAllUQURL
);

router.post('/create-test', createTestPDF);

export default router;
