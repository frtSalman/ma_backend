import express from 'express';
import {
    uploadVideoSourceURL,
    deleteVideoSourceURL,
    getVideoSources,
    updateVideoStatus,
    getScreenShot,
} from '../controllers/studentVideos.controller.js';

const router = express.Router();

router.get('/youtube-screenshot', getScreenShot);

router.get('/video-sources/:studentId', getVideoSources);

router.patch('/update-video-status', updateVideoStatus);

router.post('/add-video-source', uploadVideoSourceURL);

router.post('/delete-video-source', deleteVideoSourceURL);

export default router;
