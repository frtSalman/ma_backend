import express from 'express';
import multer from 'multer';

import {
    deleteExamURL,
    getExamResults,
    updateExam,
    uploadExam,
} from '../controllers/exam.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/get-exam-results', getExamResults);

router.post('/add-exam-result-path', upload.array('files', 15), uploadExam);

router.delete('/delete-exam-result', deleteExamURL);

router.put('/update-exam-result/:id', updateExam);

export default router;
