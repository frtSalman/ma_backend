import assert from 'node:assert/strict';
import test from 'node:test';
import Exam from '../models/exam.model.js';
import { ensureExamTypeColumn } from '../utils/ensureExamTypeColumn.js';

const fakeDatabase = columns => {
    const added = [];
    const queryInterface = {
        async describeTable(tableName) {
            assert.equal(tableName, Exam.getTableName());
            return columns;
        },
        async addColumn(tableName, name, definition) {
            added.push({ tableName, name, definition });
            columns[name] = definition;
        },
    };
    const db = {
        model(name) {
            assert.equal(name, 'Exam');
            return Exam;
        },
        getQueryInterface: () => queryInterface,
    };
    return { db, queryInterface, added };
};

test('adds only the missing examType column using the model definition', async () => {
    const { db, added } = fakeDatabase({ id: {}, examDate: {} });
    await ensureExamTypeColumn(db);
    const { type, allowNull } = Exam.getAttributes().examType;
    assert.deepEqual(added, [{
        tableName: Exam.getTableName(),
        name: 'examType',
        definition: { type, allowNull },
    }]);
});

test('exam schema update is idempotent on subsequent startups', async () => {
    const { db, added } = fakeDatabase({ id: {} });
    await ensureExamTypeColumn(db);
    await ensureExamTypeColumn(db);
    assert.equal(added.length, 1);
});

test('does not modify an existing examType column', async () => {
    const { db, added } = fakeDatabase({ examType: {} });
    await ensureExamTypeColumn(db);
    assert.equal(added.length, 0);
});

test('schema update failures propagate instead of allowing startup', async () => {
    const { db, queryInterface } = fakeDatabase({});
    queryInterface.addColumn = async () => {
        throw new Error('Schema update failed');
    };
    await assert.rejects(ensureExamTypeColumn(db), /Schema update failed/);
});
