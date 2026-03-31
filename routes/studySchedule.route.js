import express from 'express';
import {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    updateScheduleStatus, // Import the new controller function
} from '../controllers/studySchedule.controller.js';

const router = express.Router();

router.get('/get-schedules', getSchedules);
router.post('/create-schedule', createSchedule);
router.put('/update-schedule/:id', updateSchedule);
router.delete('/delete-schedule/:id', deleteSchedule);

// Add the new PATCH route for status updates
router.patch('/update-schedule-status/:id', updateScheduleStatus);

export default router;
