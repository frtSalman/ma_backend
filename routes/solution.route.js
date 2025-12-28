import express from 'express';
import { getSolution } from '../controllers/solution.controller.js';

const router = express.Router();

router.get('/:qId', getSolution);

export default router;
