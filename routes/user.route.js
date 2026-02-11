import express from 'express';
import {
    deleteStudent,
    getStudents,
    deleteParent,
} from '../controllers/user.controller.js';

const router = express.Router();

router.get('/students/:role/:id', getStudents);

router.delete('/students/:teacherId/:studentId', deleteStudent);

router.delete('/parent/:teacherId/:parentId', deleteParent);

export default router;
