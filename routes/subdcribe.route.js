import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';
import {
    createSubscriptionProduct,
    createPricingPlan,
    createSubscriptionCustomer,
    saveSubscriptionCard,
    initializeSubscription,
    getSubscriptionByReference,
    cancelSubscription,
    getMySubscriptions,
} from '../controllers/subscribe.controller.js';

const router = express.Router();

router.use(verifyToken, verifyCsrfToken);

router.post('/products', createSubscriptionProduct);
router.post('/plans', createPricingPlan);
router.post('/customers', createSubscriptionCustomer);
router.post('/cards', saveSubscriptionCard);
router.post('/initialize', initializeSubscription);
router.get('/me', getMySubscriptions);
router.get('/:subscriptionReferenceCode', getSubscriptionByReference);
router.post('/:subscriptionReferenceCode/cancel', cancelSubscription);

export default router;
