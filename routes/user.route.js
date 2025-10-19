import express from 'express';
import { deleteStudent, getStudents } from '../controllers/user.controller.js';

const router = express.Router();

router.get('/students/:teacherId', getStudents);

router.delete('/students/:teacherId/:studentId', deleteStudent);

export default router;
