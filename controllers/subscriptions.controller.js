import models from '../models/index.model.js';

const { Subscription } = models;

export const getSubscription = async (req, res) => {
    const { id } = req.params;

    try {
        const subscription = await Subscription.findOne({
            where: { userId: id },
        });
        return res.status(200).json({
            success: 'true',
            data: subscription,
        });
    } catch (error) {
        return res.status(500).json({
            success: 'false',
            message: error.message,
        });
    }
};
