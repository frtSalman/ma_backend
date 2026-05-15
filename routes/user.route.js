import express from 'express';
import multer from 'multer';
import {
    deleteStudent,
    getStudents,
    deleteParent,
    getParents,
    uploadBookSource,
    uploadVideoSourceURL,
    getBookSources,
    deleteBookSource,
    deleteVideoSourceURL,
    getVideoSources,
} from '../controllers/user.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/students/:role/:id', getStudents);

router.get('/parents/:teacherId', getParents);

router.get('/book-sources/:studentId', getBookSources);

router.get('/video-sources/:studentId', getVideoSources);

router.post('/add-book-source', upload.single('file'), uploadBookSource);

router.post('/add-video-source', uploadVideoSourceURL);

router.post('/delete-book-source', deleteBookSource);

router.post('/delete-video-source', deleteVideoSourceURL);

router.post('/add-video-source', uploadVideoSourceURL);

router.delete('/students/:teacherId/:studentId', deleteStudent);

router.delete('/parent/:teacherId/:parentId', deleteParent);

export default router;
