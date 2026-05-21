import express from 'express';
import {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    updateScheduleStatus,
    deleteAllSchedule, // Import the new controller function
} from '../controllers/studySchedule.controller.js';

const router = express.Router();

router.get('/get-schedules', getSchedules);
router.post('/create-schedule', createSchedule);
router.put('/update-schedule/:id', updateSchedule);
router.delete('/delete-schedule/:id', deleteSchedule);
router.delete('/delete-all-schedules/:studentId', deleteAllSchedule);
router.patch('/update-schedule-status/:id', updateScheduleStatus);

export default router;
