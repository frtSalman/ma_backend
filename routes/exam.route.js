import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';

import {
    deleteExamURL,
    examOCRTest,
    getExamResults,
    updateExam,
    uploadExam,
} from '../controllers/exam.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken, verifyCsrfToken);

router.get('/get-exam-results', getExamResults);

router.post('/save-exam-result', upload.array('files', 10), uploadExam);

router.post('/test-exam-result', examOCRTest);

router.delete('/delete-exam-result', deleteExamURL);

router.put('/update-exam-result/:id', updateExam);

export default router;
