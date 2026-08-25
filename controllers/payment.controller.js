import Iyzipay from 'iyzipay';
import { v4 as uuidv4 } from 'uuid';
import models from '../models/index.model.js';

const { Payment, Users, Subscription } = models;

const plans = {
    aylık: { price: 1500, addPayPer: 20, monthNum: 1 },
    ucAylık: { price: 3900, addPayPer: 50, monthNum: 3 },
    altıAylık: { price: 6900, addPayPer: 80, monthNum: 6 },
    yıllık: { price: 12900, addPayPer: 120, monthNum: 12 },
};

// pricePlan = {plan:yıllık,studentNum:30}

const calculatePrice = ({ plan, studentNum } = {}) => {
    const selectedPlan = plans[plan];

    if (!selectedPlan) {
        return null;
    }

    const normalizedStudentNum = Number(studentNum);

    if (!Number.isFinite(normalizedStudentNum) || normalizedStudentNum < 0) {
        return null;
    }

    const extraStudentCount = Math.max(0, normalizedStudentNum - 20);

    return selectedPlan.price + selectedPlan.addPayPer * extraStudentCount;
};

const calculateNextBillingDate = ({ plan } = {}) => {
    const selectedPlan = plans[plan];

    if (!selectedPlan) {
        return null;
    }

    const nextBillingDate = new Date();
    nextBillingDate.setMonth(
        nextBillingDate.getMonth() + selectedPlan.monthNum
    );

    return nextBillingDate;
};

const calculateExamAnalysisQuota = ({ plan } = {}, studentNum) => {
    const selectedPlan = plans[plan];

    if (!selectedPlan) {
        return null;
    }

    return selectedPlan.monthNum * studentNum * 5;
};

const isActiveSubscription = subscription => {
    if (!subscription?.nextBillingDate) {
        return false;
    }

    return (
        new Date(subscription.nextBillingDate) > new Date() &&
        !subscription.canceledAt
    );
};

const paymentSuccessRedirectUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/payment?payment=success'
        : 'https://app.teachflow.net/payment?payment=success';
const paymentFailureRedirectUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/payment?payment=failed'
        : 'https://app.teachflow.net/payment?payment=failed';
const paymentCallbackUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000/api/payment/3ds-callback'
        : 'https://api.teachflow.net/api/payment/3ds-callback';

const createIyzipayClient = () =>
    new Iyzipay({
        apiKey: process.env.PAYMENT_API_KEY,
        secretKey: process.env.PAYMENT_SECRET_KEY,
        uri: 'https://api.iyzipay.com',
    });

const sanitizePaymentRequest = data => ({
    ...data,
    paymentCard: {
        ...data.paymentCard,
        cardNumber: data.paymentCard.cardNumber
            ? `**** **** **** ${String(data.paymentCard.cardNumber).slice(-4)}`
            : undefined,
        cvc: undefined,
    },
});

const parsePaymentRequest = paymentRecord => {
    try {
        const storedSendData = paymentRecord?.sendData;

        if (!storedSendData) {
            return {};
        }

        if (typeof storedSendData === 'string') {
            return JSON.parse(storedSendData);
        }

        return storedSendData;
    } catch {
        return {};
    }
};

const redirectToPaymentResult = (res, redirectUrl, message) => {
    const url = new URL(redirectUrl);

    if (message) {
        url.searchParams.set('message', message);
    }

    return res.redirect(url.toString());
};

export const initializePayment = async (req, res) => {
    const conversationId = uuidv4();

    const {
        pricePlan,
        cardUserName,
        cardNumber,
        expireDate,
        cvc,
        tcNo = null,
        address = null,
        city = null,
        gsm = null,
    } = req.body;

    const teacherId = req.userId;

    // pricePlan = {plan:yıllık,studentNum:30}

    const price = calculatePrice(pricePlan);

    if (!price) {
        return res.status(400).json({
            success: false,
            message: 'Geçerli bir ödeme planı seçin.',
        });
    }

    const iyzipay = createIyzipayClient();

    try {
        const teacher = await Users.findOne({
            where: { id: teacherId },
        });

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Öğretmen bulunamadı',
            });
        }

        if (
            !teacher.tcNo ||
            !teacher.address ||
            !teacher.city ||
            !teacher.gsm
        ) {
            await teacher.update({
                tcNo,
                address,
                city,
                gsm,
            });
        }

        const activeSubscription = await Subscription.findOne({
            where: { userId: teacherId },
            order: [['createdAt', 'DESC']],
        });

        if (isActiveSubscription(activeSubscription)) {
            return res.status(409).json({
                success: false,
                message: 'Aktif bir aboneliğiniz var. Yeni ödeme başlatılamaz.',
            });
        }

        const teacherName = teacher.name + ' ' + teacher.surname;

        const rawGsm = teacher.gsm || gsm;
        const normalizedGsm = rawGsm
            ? `+90${String(rawGsm).replace(/\D/g, '').slice(-10)}`
            : null;

        const callbackUrl = new URL(paymentCallbackUrl);
        callbackUrl.searchParams.set('conversationId', conversationId);

        const data = {
            locale: Iyzipay.LOCALE.TR,
            conversationId,
            price: String(price),
            paidPrice: String(price), // nihai ödeme
            currency: Iyzipay.CURRENCY.TRY,
            installment: '1', //taksitlendirme
            paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
            paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
            callbackUrl: callbackUrl.toString(),
            paymentCard: {
                //alıcının kart bilgileri
                cardHolderName: cardUserName,
                cardNumber,
                expireMonth: expireDate?.split('/')[0],
                expireYear: `20${expireDate?.split('/')[1]}`,
                cvc,
                registerCard: 0,
            },
            buyer: {
                //alıcı bilgileri
                id: teacher.id,
                name: teacher.name,
                surname: teacher.surname,
                gsmNumber: normalizedGsm,
                email: teacher.email,
                identityNumber: tcNo || teacher.tcNo,
                registrationAddress: address || teacher.address,
                city: city || teacher.city,
                country: 'Turkey',
            },
            billingAddress: {
                //alıcı fatura adresi
                contactName: teacherName,
                city: teacher.city,
                country: 'Turkey',
                address: address || teacher.address,
            },
            basketItems: [
                {
                    id: 'BI101',
                    name: 'Temel Fiyat',
                    category1: 'cat-1',
                    itemType: 'VIRTUAL',
                    price: String(price),
                },
            ],
        };

        const resultData = await new Promise((resolve, reject) => {
            iyzipay.threedsInitialize.create(data, function (err, result) {
                if (err) return reject(err);
                if (result?.status !== 'success') {
                    return reject(
                        new Error(
                            result?.errorMessage ||
                                '3DS payment initialize failed'
                        )
                    );
                }
                return resolve(result);
            });
        });

        await Payment.create({
            sendData: sanitizePaymentRequest({
                ...data,
                pricePlan,
            }),
            resultData: resultData,
            userId: teacherId,
            conversationId,
            paymentStatus: 'pending',
        });

        return res.status(200).json({
            success: true,
            htmlContent:
                resultData.htmlContent || resultData.threeDSHtmlContent,
            data: resultData,
            message: '3DS ödeme başlatıldı.',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const complete3DSPayment = async (req, res) => {
    const callbackData = {
        ...req.query,
        ...req.body,
    };

    const { conversationId, paymentId, conversationData, status, mdStatus } =
        callbackData;

    console.log('3DS CALLBACK GELDİ', {
        method: req.method,
        origin: req.get('origin'),
        query: req.query,
        body: req.body,
    });

    if (!conversationId) {
        return redirectToPaymentResult(
            res,
            paymentFailureRedirectUrl,
            '3DS işlem referansı bulunamadı.'
        );
    }

    let paymentRecord;

    try {
        paymentRecord = await Payment.findOne({
            where: { conversationId },
        });

        if (!paymentRecord) {
            return redirectToPaymentResult(
                res,
                paymentFailureRedirectUrl,
                'Ödeme kaydı bulunamadı.'
            );
        }

        // Iyzico başarılı 3DS doğrulamasında mdStatus = "1" ve paymentId döner.
        const is3DSVerified =
            status === 'success' &&
            String(mdStatus) === '1' &&
            Boolean(paymentId);

        if (!is3DSVerified) {
            await paymentRecord.update({
                paymentStatus: 'failed',
                callbackData: callbackData,
            });

            return redirectToPaymentResult(
                res,
                paymentFailureRedirectUrl,
                '3DS doğrulaması başarısız oldu.'
            );
        }

        const iyzipay = createIyzipayClient();

        const authData = {
            locale: Iyzipay.LOCALE.TR,
            conversationId,
            paymentId,
            conversationData,
        };

        const resultData = await new Promise((resolve, reject) => {
            iyzipay.threedsPayment.create(authData, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        const paymentStatus =
            resultData?.status === 'success' ? 'success' : 'failed';

        const storedPaymentData = parsePaymentRequest(paymentRecord);
        const nextBillingDate = calculateNextBillingDate(
            storedPaymentData.pricePlan
        );

        await paymentRecord.update({
            paymentStatus,
            callbackData: callbackData,
            resultData: resultData,
        });

        if (paymentStatus !== 'success') {
            return redirectToPaymentResult(
                res,
                paymentFailureRedirectUrl,
                resultData?.errorMessage || 'Ödeme tamamlanamadı.'
            );
        }

        if (!nextBillingDate) {
            await paymentRecord.update({
                paymentStatus: 'failed',
                callbackData: {
                    ...callbackData,
                    subscriptionError: 'Geçerli bir ödeme planı bulunamadı.',
                },
            });

            return redirectToPaymentResult(
                res,
                paymentFailureRedirectUrl,
                'Geçerli bir ödeme planı bulunamadı.'
            );
        }

        const existingSubscription = await Subscription.findOne({
            where: { conversationId },
        });

        if (existingSubscription) {
            return redirectToPaymentResult(res, paymentSuccessRedirectUrl);
        }

        const examAnalyseQuota = calculateExamAnalysisQuota(
            storedPaymentData.pricePlan,
            paymentRecord?.sendData?.pricePlan?.studentNum
        );

        await Subscription.create({
            userId: paymentRecord.userId,
            conversationId,
            nextBillingDate,
            studentNum: paymentRecord?.sendData?.pricePlan?.studentNum,
            callbackData: resultData,
            aiAnalysedExamNumQuota: examAnalyseQuota,
        });

        return redirectToPaymentResult(res, paymentSuccessRedirectUrl);
    } catch (error) {
        console.error('3DS ödeme tamamlama hatası:', error);

        if (paymentRecord) {
            await paymentRecord.update({
                paymentStatus: 'failed',
                callbackData: callbackData,
            });
        }

        return redirectToPaymentResult(
            res,
            paymentFailureRedirectUrl,
            error.message || 'Ödeme tamamlanamadı.'
        );
    }
};
