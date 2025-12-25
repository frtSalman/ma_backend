import express from 'express';
import {
    getStudentHomeworks,
    addHomework,
    deleteHomework,
    updateHomework,
    updateHomeworkStatus,
    getAllHomeworks,
} from '../controllers/homework.controller.js';

const router = express.Router();

router.get('/get-homeworks', getStudentHomeworks);

router.get('/get-homeworks/:teacherId', getAllHomeworks);

router.post('/add-homework', addHomework);

router.delete('/delete-homework/:id', deleteHomework);

router.put('/update-homework/:id', updateHomework);

router.put('/update-homework-status/:id/:day', updateHomeworkStatus);

export default router;
