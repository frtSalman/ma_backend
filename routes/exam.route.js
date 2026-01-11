import express from 'express';

import {
    deleteExamURL,
    getExamResults,
    uploadExamURL,
} from '../controllers/exam.controller.js';

const router = express.Router();

router.get('/get-exam-results', getExamResults);

router.post('/add-exam-result-path', uploadExamURL);

router.delete('/delete-exam-result/:id', deleteExamURL);

export default router;
