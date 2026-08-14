import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';
import {
    uploadVideoSourceURL,
    deleteVideoSourceURL,
    getVideoSources,
    updateVideoStatus,
    saveVideoQuestions,
    getVideoQuestions,
} from '../controllers/studentVideos.controller.js';

const router = express.Router();

router.use(verifyToken, verifyCsrfToken);

router.post('/video-questions', saveVideoQuestions);

router.get('/video-sources/:studentId', getVideoSources);

router.get('/video-questions/:videoId', getVideoQuestions);

router.patch('/update-video-status', updateVideoStatus);

router.post('/add-video-source', uploadVideoSourceURL);

router.post('/delete-video-source', deleteVideoSourceURL);

export default router;
