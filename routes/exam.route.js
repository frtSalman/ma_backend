import express from 'express';

import {
    deleteExamURL,
    getExamResult,
    uploadExamURL,
} from '../controllers/exam.controller.js';

const router = express.Router();

router.get('/exam-result', getExamResult);

router.post('/add-exam-result-path', uploadExamURL);

router.delete('/delete-exam-result', deleteExamURL);

export default router;
