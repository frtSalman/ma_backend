import express from 'express';
import {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    updateScheduleStatus,
    deleteAllSchedule, // Import the new controller function
    createSchedulePDF, // Import the new controller function
} from '../controllers/studySchedule.controller.js';
import { getScreenShot } from '../controllers/studentVideos.controller.js';

const router = express.Router();

router.get('/get-schedules', getSchedules);
router.post('/create-schedule', createSchedule);
router.post('/create-schedule-pdf/:studentId/:studentName', createSchedulePDF);
router.put('/update-schedule/:id', updateSchedule);
router.delete('/delete-schedule/:id', deleteSchedule);
router.delete('/delete-all-schedules/:studentId', deleteAllSchedule);
router.patch('/update-schedule-status/:id', updateScheduleStatus);
router.get('/youtube-screenshot', getScreenShot);

export default router;
