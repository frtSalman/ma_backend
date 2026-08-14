import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';
import {
    addStats,
    getStudentStats,
    getHomeworkStats,
    updateStats,
    deleteAllStats,
} from '../controllers/statistic.controller.js';

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true }));

router.use(verifyToken, verifyCsrfToken);

router.get('/getstudentstats/:id', getStudentStats);

router.get('/gethomeworkstats/:id', getHomeworkStats);

router.delete('/deleteAllStats/:id', deleteAllStats);

router.post('/add-stats', addStats);

router.put('/update-stats', updateStats);

export default router;
