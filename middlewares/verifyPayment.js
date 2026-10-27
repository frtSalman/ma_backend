import models from '../models/index.model.js';

const { Users, Subscription } = models;

export const verifyPayment = async (req, res, next) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Tekrar giriş yapın.',
        });
    }

    try {
        const user = await Users.findOne({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı.',
            });
        }

        if (user.role !== 'teacher') {
            return next();
        }

        if (user.accountType === 'admin') {
            return next();
        }

        const subscription = await Subscription.findOne({
            where: { userId },
        });

        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'Lütfen bir ödeme planı seçip kayıt olunuz.',
            });
        }

        const now = new Date();
        const isTrial = subscription.subStatus === 'trial';
        const isPassive = subscription.subStatus === 'passive';

        const isTrialExpired =
            isTrial &&
            (!subscription.trialEndDate ||
                new Date(subscription.trialEndDate) <= now);

        const isSubscriptionExpired =
            !isTrial &&
            (!subscription.nextBillingDate ||
                new Date(subscription.nextBillingDate) <= now);

        if (isTrialExpired) {
            if (!isPassive) {
                await subscription.update({ subStatus: 'passive' });
            }

            return res.status(403).json({
                success: false,
                message:
                    'Deneme süreniz dolmuştur. Lütfen abonelik satın alınız.',
            });
        }

        if (isSubscriptionExpired || isPassive) {
            if (!isPassive) {
                await subscription.update({ subStatus: 'passive' });
            }

            return res.status(403).json({
                success: false,
                message:
                    'Abonelik süreniz dolmuştur. Lütfen aboneliğinizi yenileyiniz.',
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
