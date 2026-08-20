import { Op } from 'sequelize';

import models from '../models/index.model.js';

const { Payment } = models;

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

export const cleanupExpiredPayments = async () => {
    const cutoffDate = new Date(Date.now() - THIRTY_DAYS_IN_MS);

    const deletedCount = await Payment.destroy({
        where: {
            createdAt: {
                [Op.lt]: cutoffDate,
            },
        },
    });

    if (deletedCount > 0) {
        console.log(`Deleted ${deletedCount} expired payment record(s).`);
    }

    return deletedCount;
};

export const startPaymentCleanupJob = () => {
    cleanupExpiredPayments().catch(error => {
        console.error('Initial payment cleanup failed:', error);
    });

    return setInterval(
        () => {
            cleanupExpiredPayments().catch(error => {
                console.error('Scheduled payment cleanup failed:', error);
            });
        },
        24 * 60 * 60 * 1000
    );
};
