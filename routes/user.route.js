import express from 'express';
import {
    deleteStudent,
    getStudents,
    getParentStudents,
    deleteParent,
} from '../controllers/user.controller.js';

const router = express.Router();

router.get('/students/:teacherId', getStudents);

router.get('/parent/students', getParentStudents);

router.delete('/students/:teacherId/:studentId', deleteStudent);

router.delete('/parent/:teacherId/:parentId', deleteParent);

export default router;
