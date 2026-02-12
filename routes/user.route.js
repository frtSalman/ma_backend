import express from 'express';
import {
    deleteStudent,
    getStudents,
    deleteParent,
    getParents,
} from '../controllers/user.controller.js';

const router = express.Router();

router.get('/students/:role/:id', getStudents);

router.get('/parents/:teacherId', getParents);

router.delete('/students/:teacherId/:studentId', deleteStudent);

router.delete('/parent/:teacherId/:parentId', deleteParent);

export default router;
