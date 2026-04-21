import express from 'express';
import multer from 'multer';
import {
    deleteStudent,
    getStudents,
    deleteParent,
    getParents,
    uploadBookSource,
    uploadVideoSourceURL,
} from '../controllers/user.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/students/:role/:id', getStudents);

router.get('/parents/:teacherId', getParents);

router.post('/add-book-source', upload.single('file'), uploadBookSource);

router.post('/add-video-source', uploadVideoSourceURL);

router.delete('/students/:teacherId/:studentId', deleteStudent);

router.delete('/parent/:teacherId/:parentId', deleteParent);

export default router;
