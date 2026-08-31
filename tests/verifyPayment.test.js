import test from 'node:test';
import assert from 'node:assert/strict';
import models from '../models/index.model.js';
import { verifyPayment } from '../middlewares/verifyPayment.js';

const { Users, Subscription } = models;

const originalUsersFindOne = Users.findOne;
const originalSubscriptionFindOne = Subscription.findOne;

const createMockRes = () => {
    const response = {
        statusCode: null,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.payload = data;
            return this;
        },
    };

    return response;
};

const restoreModelMethods = () => {
    Users.findOne = originalUsersFindOne;
    Subscription.findOne = originalSubscriptionFindOne;
};

test.afterEach(() => {
    restoreModelMethods();
});

test('allows request when trial is not expired', async () => {
    Users.findOne = async () => ({ role: 'teacher', accountType: 'normal' });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    let updateCalled = false;
    Subscription.findOne = async () => ({
        subStatus: 'trial',
        trialEndDate: tomorrow,
        nextBillingDate: tomorrow,
        async update() {
            updateCalled = true;
        },
    });

    const req = { userId: 'user-1' };
    const res = createMockRes();
    let nextCalled = false;
    const next = () => {
        nextCalled = true;
    };

    await verifyPayment(req, res, next);

    assert.equal(nextCalled, true);
    assert.equal(updateCalled, false);
    assert.equal(res.statusCode, null);
    assert.equal(res.payload, null);
});

test('blocks request and sets passive when trial is expired', async () => {
    Users.findOne = async () => ({ role: 'teacher', accountType: 'normal' });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let updatedStatus = null;
    Subscription.findOne = async () => ({
        subStatus: 'trial',
        trialEndDate: yesterday,
        nextBillingDate: yesterday,
        async update(payload) {
            updatedStatus = payload.subStatus;
        },
    });

    const req = { userId: 'user-2' };
    const res = createMockRes();
    let nextCalled = false;
    const next = () => {
        nextCalled = true;
    };

    await verifyPayment(req, res, next);

    assert.equal(nextCalled, false);
    assert.equal(updatedStatus, 'passive');
    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.success, false);
    assert.match(res.payload.message, /Deneme süreniz dolmuştur/i);
});

test('blocks request and sets passive when paid subscription is expired', async () => {
    Users.findOne = async () => ({ role: 'teacher', accountType: 'normal' });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let updatedStatus = null;
    Subscription.findOne = async () => ({
        subStatus: 'active',
        nextBillingDate: yesterday,
        async update(payload) {
            updatedStatus = payload.subStatus;
        },
    });

    const req = { userId: 'user-3' };
    const res = createMockRes();
    let nextCalled = false;
    const next = () => {
        nextCalled = true;
    };

    await verifyPayment(req, res, next);

    assert.equal(nextCalled, false);
    assert.equal(updatedStatus, 'passive');
    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.success, false);
    assert.match(res.payload.message, /Abonelik süreniz dolmuştur/i);
});
