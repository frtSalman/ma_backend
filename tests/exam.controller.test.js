import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import models from '../models/index.model.js';
import { uploadExam } from '../controllers/exam.controller.js';

const { Exam, Users, Subscription, Cirriculum } = models;
const response = () => ({
    statusCode: 200,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

const setup = (t, { examDate = '27.10.2026', count = 1 } = {}) => {
    const teacher = {
        name: 'Test', surname: 'Teacher', role: 'teacher', accountType: 'normal',
        async increment() {},
    };
    const student = { name: 'Test Student', grade: '8' };
    const subscription = {
        aiAnalysedExamNum: 0, aiAnalysedExamNumQuota: 10,
        async increment() {},
    };
    const teacherIncrement = t.mock.method(teacher, 'increment');
    const subscriptionIncrement = t.mock.method(subscription, 'increment');
    t.mock.method(Users, 'findOne', async ({ where }) =>
        where.id === 'teacher-1' ? teacher : student
    );
    t.mock.method(Subscription, 'findOne', async () => subscription);
    t.mock.method(Cirriculum, 'findAll', async () => [{ topic: 'Sayılar' }]);
    const upload = t.mock.method(axios, 'put', async () => ({ status: 201 }));
    const webhook = t.mock.method(axios, 'post', async () => ({
        data: {
            header: {
                examDate, examName: 'Test Exam', examType: 'LGS', totalPoint: 400,
            },
            analysis: {
                Matematik: [{ topic: 'Sayılar', T: 20, D: 16, Y: 4 }],
            },
        },
    }));
    const create = t.mock.method(Exam, 'create', async values => values);
    const errors = t.mock.method(console, 'error', () => {});
    const req = {
        body: { studentId: 'student-1' },
        userId: 'teacher-1',
        files: Array.from({ length: count }, (_, index) => ({
            originalname: `exam-${index}.pdf`,
            mimetype: 'application/pdf',
            buffer: Buffer.from('test exam'),
        })),
    };
    return {
        req, upload, webhook, create, errors,
        teacherIncrement, subscriptionIncrement,
    };
};

test('persists the uploaded exam with its type, analysis, summary and UTC date', async t => {
    const fixture = setup(t);
    const res = response();
    await uploadExam(fixture.req, res);

    assert.equal(fixture.upload.mock.callCount(), 1);
    assert.equal(fixture.webhook.mock.callCount(), 1);
    assert.equal(fixture.create.mock.callCount(), 1);
    const [saved] = fixture.create.mock.calls[0].arguments;
    assert.equal(saved.examType, 'LGS');
    assert.equal(saved.examTitle, 'Test Exam');
    assert.equal(saved.studentId, 'student-1');
    assert.equal(saved.teacherId, 'teacher-1');
    assert.equal(saved.totalPoint, 400);
    assert.equal(saved.examDate.toISOString(), '2026-10-27T00:00:00.000Z');
    assert.equal(saved.analysis[0].status, 'exact_resolved');
    assert.deepEqual(saved.scoreSummary, {
        Matematik: { D: 16, Y: 4, SS: 20, NET: 15, subject: 'Matematik' },
        totals: { D: 16, Y: 4, SS: 20, NET: 15 },
    });
    assert.equal(saved.path, fixture.webhook.mock.calls[0].arguments[1].path);
    assert.equal(res.body.success, true);
    assert.equal(res.body.processedCount, 1);
    assert.equal(res.body.failedCount, 0);
    assert.deepEqual(fixture.teacherIncrement.mock.calls[0].arguments,
        [{ aiAnalysedExamNum: 1 }]);
    assert.deepEqual(fixture.subscriptionIncrement.mock.calls[0].arguments,
        [{ aiAnalysedExamNum: 1 }]);
});

for (const [examDate, expected] of [
    ['10.11.2026', '2026-11-10T00:00:00.000Z'],
    ['1.2.2026', '2026-02-01T00:00:00.000Z'],
    ['2026-10-27', '2026-10-27T00:00:00.000Z'],
    ['29.02.2024', '2024-02-29T00:00:00.000Z'],
]) {
    test(`saves ${examDate} without locale-dependent date conversion`, async t => {
        const fixture = setup(t, { examDate });
        const res = response();
        await uploadExam(fixture.req, res);
        const [saved] = fixture.create.mock.calls[0].arguments;
        assert.equal(saved.examDate.toISOString(), expected);
        assert.equal(res.body.success, true);
    });
}

for (const examDate of [undefined, null, '', '   ']) {
    test(`allows an optional exam date: ${JSON.stringify(examDate)}`, async t => {
        const fixture = setup(t, { examDate: null });
        fixture.webhook.mock.mockImplementation(async () => ({
            data: { header: { examDate, examType: 'LGS' }, analysis: {} },
        }));
        const res = response();
        await uploadExam(fixture.req, res);
        const [saved] = fixture.create.mock.calls[0].arguments;
        assert.equal(saved.examDate, null);
        assert.equal(res.body.success, true);
    });
}

for (const examDate of ['31.02.2026', '29.02.2025', 'invalid', 123]) {
    test(`reports an invalid exam date without charging quota: ${examDate}`, async t => {
        const fixture = setup(t, { examDate });
        const res = response();
        await uploadExam(fixture.req, res);
        assert.equal(fixture.create.mock.callCount(), 0);
        assert.equal(fixture.teacherIncrement.mock.callCount(), 0);
        assert.equal(fixture.subscriptionIncrement.mock.callCount(), 0);
        assert.equal(fixture.errors.mock.callCount(), 1);
        assert.equal(res.body.success, false);
        assert.equal(res.body.failedCount, 1);
    });
}

test('logs database rejection details instead of silently swallowing them', async t => {
    const fixture = setup(t);
    fixture.create.mock.mockImplementation(async () => {
        const error = new Error('column "examType" does not exist');
        error.original = { code: '42703' };
        throw error;
    });
    const res = response();
    await uploadExam(fixture.req, res);
    assert.equal(fixture.upload.mock.callCount(), 1);
    assert.equal(fixture.teacherIncrement.mock.callCount(), 0);
    assert.equal(fixture.subscriptionIncrement.mock.callCount(), 0);
    assert.deepEqual(fixture.errors.mock.calls[0].arguments[1], {
        file: 'exam-0.pdf',
        error: 'column "examType" does not exist',
        databaseCode: '42703',
    });
    assert.equal(res.body.success, false);
    assert.equal(res.body.processedCount, 0);
    assert.equal(res.body.failedCount, 1);
    assert.ok(!JSON.stringify(res.body).includes('42703'));
});

test('charges only successful inserts in a partially failed upload', async t => {
    const fixture = setup(t, { count: 2 });
    fixture.create.mock.mockImplementationOnce(async () => {
        throw new Error('Database insert failed');
    });
    const res = response();
    await uploadExam(fixture.req, res);
    assert.equal(fixture.create.mock.callCount(), 2);
    assert.equal(res.body.success, false);
    assert.equal(res.body.processedCount, 1);
    assert.equal(res.body.failedCount, 1);
    assert.deepEqual(fixture.teacherIncrement.mock.calls[0].arguments,
        [{ aiAnalysedExamNum: 1 }]);
    assert.deepEqual(fixture.subscriptionIncrement.mock.calls[0].arguments,
        [{ aiAnalysedExamNum: 1 }]);
});

test('does not insert an exam or charge quota when the webhook fails', async t => {
    const fixture = setup(t);
    fixture.webhook.mock.mockImplementation(async () => {
        throw new Error('Webhook failed');
    });
    const res = response();
    await uploadExam(fixture.req, res);
    assert.equal(fixture.create.mock.callCount(), 0);
    assert.equal(fixture.teacherIncrement.mock.callCount(), 0);
    assert.equal(fixture.subscriptionIncrement.mock.callCount(), 0);
    assert.equal(res.body.failedCount, 1);
});

test('rejects an empty upload before accessing external services', async t => {
    const fixture = setup(t, { count: 0 });
    const res = response();
    await uploadExam(fixture.req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(fixture.upload.mock.callCount(), 0);
    assert.equal(fixture.create.mock.callCount(), 0);
});
