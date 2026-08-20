import models from '../models/index.model.js';

const { Users, Subscription } = models;

export const verifyPayment = async (req, res, next) => {
    const userId = req.userId;

    console.trace(req.userId);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Tekrar giriş yapın.',
        });
    }

    try {
        const user = await Users.findOne({ where: { id: userId } });

        if (user.role !== 'teacher') {
            return next();
        }

        if (user.accountType === 'admin') {
            return next();
        }

        const subscription = await Subscription.findOne({
            where: { userId },
            order: [['createdAt', 'DESC']],
        });

        if (!subscription && user.accountType === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Lütfen bir ödeme planı seçip kayıt olunuz.',
            });
        }

        if (
            subscription &&
            subscription.nextBillingDate &&
            new Date(subscription.nextBillingDate) < new Date() &&
            user.accountType === 'normal'
        ) {
            return res.status(403).json({
                success: false,
                message:
                    'Bu hizmeti kullanabilmek için ödeme yapmanız gerekir.',
            });
        }

        next();
    } catch (error) {
        console.error('Payment verification failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Ödeme kontrolü sırasında bir hata oluştu.',
        });
    }
};
