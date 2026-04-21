import express from 'express';
import multer from 'multer';
import {
    uploadUQ,
    deleteUQURL,
    getUQURL,
    updateUQAppearance,
    createTestPDF,
} from '../controllers/unsolvedQustion.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/add-unsolved-question-path', upload.array('files', 15), uploadUQ);

router.put('/update-unsolved-question-view', updateUQAppearance);

router.get('/get-unsolved-question-path', getUQURL);

router.delete('/delete-unsolved-question-path/:path', deleteUQURL);

router.post('/create-test', createTestPDF);

export default router;
