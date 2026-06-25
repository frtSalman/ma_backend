import express from 'express';
import {
    uploadVideoSourceURL,
    deleteVideoSourceURL,
    getVideoSources,
    updateVideoStatus,
    saveVideoQuestions,
    getVideoQuestions,
} from '../controllers/studentVideos.controller.js';

const router = express.Router();

router.post('/video-questions', saveVideoQuestions);

router.get('/video-sources/:studentId', getVideoSources);

router.get('/video-questions/:videoId', getVideoQuestions);

router.patch('/update-video-status', updateVideoStatus);

router.post('/add-video-source', uploadVideoSourceURL);

router.post('/delete-video-source', deleteVideoSourceURL);

export default router;
