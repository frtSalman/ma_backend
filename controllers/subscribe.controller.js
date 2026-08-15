import models from '../models/index.model.js';
import { iyzicoRequest } from '../utils/iyzicoClient.js';

/* 
IYZICO_API_KEY= 
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=
 */

const { Subscription, Users } = models;

// Iyzico'dan dönen hata mesajını standart API response formatında döner.
const iyzicoFail = (res, response, defaultMessage) => {
    return res.status(400).json({
        success: false,
        message: response?.errorMessage || defaultMessage,
        iyzico: response,
    });
};

// Iyzico tarih alanlarını güvenli biçimde Date nesnesine çevirir.
const toDate = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

// Iyzico abonelik cevabını local subscriptions tablosuna ekler veya günceller.
const upsertLocalSubscription = async ({ userId, responseData }) => {
    const data = responseData?.data || {};
    const subscriptionReferenceCode = data.subscriptionReferenceCode;

    if (!subscriptionReferenceCode) {
        return;
    }

    const payload = {
        userId,
        subscriptionReferenceCode,
        customerReferenceCode: data.customerReferenceCode || null,
        productReferenceCode: data.productReferenceCode || null,
        pricingPlanReferenceCode: data.pricingPlanReferenceCode || null,
        status: data.subscriptionStatus || data.status || 'PENDING',
        paymentStatus: data.paymentStatus || null,
        price: data.price || null,
        currency: data.currencyCode || data.currency || null,
        trialEndDate: toDate(data.trialEndDate),
        nextBillingDate: toDate(data.nextBillingDate),
        canceledAt:
            data.subscriptionStatus === 'CANCELED' ? new Date() : undefined,
        rawResponse: responseData,
    };

    const existing = await Subscription.findOne({
        where: { subscriptionReferenceCode },
    });

    if (!existing) {
        await Subscription.create(payload);
        return;
    }

    await existing.update(payload);
};

// Iyzico üzerinde abonelik ürünü oluşturur.
export const createSubscriptionProduct = async (req, res) => {
    const { name, description, locale = 'tr', conversationId } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: 'Ürün adı zorunludur.',
        });
    }

    try {
        const response = await iyzicoRequest({
            method: 'post',
            path: '/v2/subscription/products',
            body: {
                locale,
                conversationId,
                name,
                description,
            },
        });

        if (response?.status !== 'success') {
            return iyzicoFail(res, response, 'Abonelik ürünü oluşturulamadı.');
        }

        return res.status(201).json({
            success: true,
            message: 'Abonelik ürünü oluşturuldu.',
            data: response?.data,
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            success: false,
            message: 'Iyzico ürün oluşturma sırasında hata oluştu.',
        });
    }
};

// Iyzico üzerinde belirli bir ürün için fiyat planı oluşturur.
export const createPricingPlan = async (req, res) => {
    const {
        name,
        productReferenceCode,
        price,
        currencyCode = 'TRY',
        paymentInterval = 'MONTHLY',
        paymentIntervalCount = 1,
        trialPeriodDays = 7,
        planPaymentType = 'RECURRING',
        conversationId,
        locale = 'tr',
    } = req.body;

    if (!name || !productReferenceCode || !price) {
        return res.status(400).json({
            success: false,
            message:
                'Plan adı, ürün referans kodu ve fiyat alanları zorunludur.',
        });
    }

    try {
        const response = await iyzicoRequest({
            method: 'post',
            path: '/v2/subscription/pricing-plans',
            body: {
                locale,
                conversationId,
                name,
                productReferenceCode,
                price,
                currencyCode,
                paymentInterval,
                paymentIntervalCount,
                trialPeriodDays,
                planPaymentType,
            },
        });

        if (response?.status !== 'success') {
            return iyzicoFail(res, response, 'Fiyat planı oluşturulamadı.');
        }

        return res.status(201).json({
            success: true,
            message: 'Abonelik planı oluşturuldu.',
            data: response?.data,
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            success: false,
            message: 'Iyzico plan oluşturma sırasında hata oluştu.',
        });
    }
};

// Iyzico abonelik müşterisi oluşturur ve fatura adresi bilgilerini kaydeder.
export const createSubscriptionCustomer = async (req, res) => {
    const {
        name,
        surname,
        email,
        gsmNumber,
        identityNumber,
        billingContactName,
        billingCity,
        billingCountry,
        billingAddress,
        billingZipCode,
        locale = 'tr',
        conversationId,
    } = req.body;

    if (
        !name ||
        !surname ||
        !email ||
        !gsmNumber ||
        !identityNumber ||
        !billingContactName ||
        !billingCity ||
        !billingCountry ||
        !billingAddress
    ) {
        return res.status(400).json({
            success: false,
            message: 'Müşteri oluşturmak için zorunlu alanlar eksik.',
        });
    }

    try {
        const response = await iyzicoRequest({
            method: 'post',
            path: '/v2/subscription/customers',
            body: {
                locale,
                conversationId,
                name,
                surname,
                email,
                gsmNumber,
                identityNumber,
                billingAddress: {
                    contactName: billingContactName,
                    city: billingCity,
                    country: billingCountry,
                    address: billingAddress,
                    zipCode: billingZipCode,
                },
            },
        });

        if (response?.status !== 'success') {
            return iyzicoFail(res, response, 'Müşteri oluşturulamadı.');
        }

        return res.status(201).json({
            success: true,
            message: 'Abonelik müşterisi oluşturuldu.',
            data: response?.data,
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            success: false,
            message: 'Iyzico müşteri oluşturma sırasında hata oluştu.',
        });
    }
};

// Müşteriye ait kart bilgisini Iyzico tarafında tokenize ederek saklar.
export const saveSubscriptionCard = async (req, res) => {
    const {
        customerReferenceCode,
        cardHolderName,
        cardNumber,
        expireMonth,
        expireYear,
        cvc,
        cardAlias,
        locale = 'tr',
        conversationId,
    } = req.body;

    if (
        !customerReferenceCode ||
        !cardHolderName ||
        !cardNumber ||
        !expireMonth ||
        !expireYear ||
        !cvc
    ) {
        return res.status(400).json({
            success: false,
            message: 'Kart kaydı için zorunlu alanlar eksik.',
        });
    }

    try {
        const response = await iyzicoRequest({
            method: 'post',
            path: `/v2/subscription/customers/${customerReferenceCode}/cards`,
            body: {
                locale,
                conversationId,
                card: {
                    cardHolderName,
                    cardNumber,
                    expireMonth,
                    expireYear,
                    cvc,
                    cardAlias,
                },
            },
        });

        if (response?.status !== 'success') {
            return iyzicoFail(res, response, 'Kart kaydı yapılamadı.');
        }

        return res.status(201).json({
            success: true,
            message: 'Kart başarıyla kaydedildi.',
            data: response?.data,
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            success: false,
            message: 'Iyzico kart kaydı sırasında hata oluştu.',
        });
    }
};

// Plan + müşteri + kart referanslarıyla aboneliği başlatır ve local kaydı günceller.
export const initializeSubscription = async (req, res) => {
    const {
        pricingPlanReferenceCode,
        customerReferenceCode,
        cardReferenceCode,
        subscriptionInitialStatus = 'ACTIVE',
        locale = 'tr',
        conversationId,
    } = req.body;

    if (
        !pricingPlanReferenceCode ||
        !customerReferenceCode ||
        !cardReferenceCode
    ) {
        return res.status(400).json({
            success: false,
            message:
                'Abonelik başlatmak için plan, müşteri ve kart referans kodları zorunludur.',
        });
    }

    try {
        const response = await iyzicoRequest({
            method: 'post',
            path: '/v2/subscription/initializations',
            body: {
                locale,
                conversationId,
                pricingPlanReferenceCode,
                customerReferenceCode,
                cardReferenceCode,
                subscriptionInitialStatus,
            },
        });

        if (response?.status !== 'success') {
            return iyzicoFail(res, response, 'Abonelik başlatılamadı.');
        }

        await upsertLocalSubscription({
            userId: req.userId,
            responseData: response,
        });

        return res.status(201).json({
            success: true,
            message: 'Abonelik başarıyla başlatıldı.',
            data: response?.data,
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            success: false,
            message: 'Iyzico abonelik başlatma sırasında hata oluştu.',
        });
    }
};

// Referans koda göre Iyzico'dan abonelik detayını getirir ve localde senkronlar.
export const getSubscriptionByReference = async (req, res) => {
    const { subscriptionReferenceCode } = req.params;

    if (!subscriptionReferenceCode) {
        return res.status(400).json({
            success: false,
            message: 'Abonelik referans kodu zorunludur.',
        });
    }

    try {
        const response = await iyzicoRequest({
            method: 'get',
            path: `/v2/subscription/subscriptions/${subscriptionReferenceCode}`,
        });

        if (response?.status !== 'success') {
            return iyzicoFail(res, response, 'Abonelik detayı alınamadı.');
        }

        await upsertLocalSubscription({
            userId: req.userId,
            responseData: response,
        });

        return res.status(200).json({
            success: true,
            message: 'Abonelik detayı getirildi.',
            data: response?.data,
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            success: false,
            message: 'Iyzico abonelik detay sorgusunda hata oluştu.',
        });
    }
};

// Iyzico üzerindeki aktif aboneliği iptal eder ve local kaydı canceled durumuna çeker.
export const cancelSubscription = async (req, res) => {
    const { subscriptionReferenceCode } = req.params;
    const { locale = 'tr', conversationId } = req.body;

    if (!subscriptionReferenceCode) {
        return res.status(400).json({
            success: false,
            message: 'Abonelik referans kodu zorunludur.',
        });
    }

    try {
        const response = await iyzicoRequest({
            method: 'post',
            path: `/v2/subscription/subscriptions/${subscriptionReferenceCode}/cancel`,
            body: {
                locale,
                conversationId,
            },
        });

        if (response?.status !== 'success') {
            return iyzicoFail(res, response, 'Abonelik iptal edilemedi.');
        }

        const localSubscription = await Subscription.findOne({
            where: { subscriptionReferenceCode },
        });

        if (localSubscription) {
            await localSubscription.update({
                status: 'CANCELED',
                canceledAt: new Date(),
                rawResponse: response,
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Abonelik iptal edildi.',
            data: response?.data,
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            success: false,
            message: 'Iyzico abonelik iptalinde hata oluştu.',
        });
    }
};

// Giriş yapan kullanıcıya ait local abonelik geçmişini listeler.
export const getMySubscriptions = async (req, res) => {
    try {
        const user = await Users.findOne({ where: { id: req.userId } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı.',
            });
        }

        const subscriptions = await Subscription.findAll({
            where: { userId: req.userId },
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({
            success: true,
            message: 'Kullanıcı abonelikleri getirildi.',
            subscriptions,
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            success: false,
            message: 'Abonelik kayıtları getirilirken hata oluştu.',
        });
    }
};
