import express from 'express';
import multer from 'multer';
import {
    deleteStudent,
    getStudents,
    deleteParent,
    getParents,
    uploadBookSource,
    getBookSources,
    deleteBookSource,
} from '../controllers/user.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/students/:role/:id', getStudents);

router.get('/parents/:teacherId', getParents);

router.get('/book-sources/:studentId', getBookSources);

router.post('/add-book-source', upload.single('file'), uploadBookSource);

router.post('/delete-book-source', deleteBookSource);

router.delete('/students/:teacherId/:studentId', deleteStudent);

router.delete('/parent/:teacherId/:parentId', deleteParent);

export default router;
