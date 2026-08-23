import express from 'express';
import {
    getAllSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    updateScheduleStatus,
    deleteAllSchedule, // Import the new controller function
    createSchedulePDF,
    createBulkSchedule,
    getStudentSchedules, // Import the new controller function
} from '../controllers/studySchedule.controller.js';
import { verifyPayment } from '../middlewares/verifyPayment.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';

const router = express.Router();

router.use(verifyToken, verifyCsrfToken);

router.get('/get-all-schedules', getAllSchedules);
router.get('/get-student-schedules/:teacherId/:studentId', getStudentSchedules);
router.post('/create-schedule', verifyPayment, createSchedule);
router.post('/create-bulk-schedule', verifyPayment, createBulkSchedule);
router.post(
    '/create-schedule-pdf/:studentId/:studentName',
    verifyPayment,
    createSchedulePDF
);
router.put('/update-schedule/:id', verifyPayment, updateSchedule);
router.delete('/delete-schedule/:id', verifyPayment, deleteSchedule);
router.delete('/delete-all-schedules/:studentId', deleteAllSchedule);
router.patch('/update-schedule-status/:id', updateScheduleStatus);

export default router;
