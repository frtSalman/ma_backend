import express from 'express';
import { getSubscription } from '../controllers/subscriptions.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';

const router = express.Router();

router.use(verifyToken, verifyCsrfToken);

router.get('/get-subscription', getSubscription);

export default router;
