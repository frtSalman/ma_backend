import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';
import { getSolution } from '../controllers/solution.controller.js';

const router = express.Router();

router.use(verifyToken, verifyCsrfToken);

router.get('/:qId', getSolution);

export default router;
