import assert from 'node:assert/strict';
import test from 'node:test';
import StudentVideos from '../models/studentVideos.model.js';
import { removeLegacyStudentVideoIndexes } from '../utils/removeLegacyStudentVideoIndexes.js';

const queryGenerator = StudentVideos.sequelize.getQueryInterface().queryGenerator;

test('video identity uses student, subject, playlist and URL instead of title', () => {
    const indexes = StudentVideos.options.indexes;
    assert.equal(indexes.length, 1);
    const sql = queryGenerator.addIndexQuery(StudentVideos.getTableName(), indexes[0]);
    assert.equal(sql,
        'CREATE UNIQUE INDEX "student_videos_student_subject_playlist_url_unique" ON "student_videos" ("studentId", "subject", COALESCE("playList"->>\'id\', \'\'), "url")');
    assert.ok(!sql.includes('sourceName'));
});

test('concurrent playlist imports use PostgreSQL conflict handling', () => {
    const sql = queryGenerator.bulkInsertQuery(StudentVideos.getTableName(), [{
        studentId: 'student', subject: 'Matematik', url: 'video',
        playList: { id: 'playlist' },
    }], { ignoreDuplicates: true }, StudentVideos.rawAttributes);
    assert.match(sql, /ON CONFLICT DO NOTHING/);
});

const index = (name, fields, unique = true) => ({
    name, unique, fields: fields.map(attribute => ({ attribute })),
});

const fakeDatabase = indexes => {
    const transaction = { id: 'transaction' };
    const calls = [];
    const db = {
        getQueryInterface: () => ({
            queryGenerator,
            async showIndex(tableName, options) {
                assert.equal(tableName, 'student_videos');
                assert.equal(options.transaction, transaction);
                return indexes;
            },
            async removeIndex(tableName, name, options) {
                assert.equal(tableName, 'student_videos');
                assert.equal(options.transaction, transaction);
                calls.push(['index', name]);
            },
        }),
        async transaction(callback) {
            return callback(transaction);
        },
        async query(sql, options) {
            assert.equal(options.transaction, transaction);
            calls.push(['constraint', sql]);
        },
    };
    return { db, calls };
};

test('retires only legacy student/title unique constraints and indexes', async () => {
    const { db, calls } = fakeDatabase([
        index('legacy_index', ['studentId', 'sourceName']),
        index('legacy_constraint', ['sourceName', 'studentId']),
        index('student_videos_student_subject_playlist_url_unique', ['studentId', 'subject', 'url']),
        index('student_videos_pkey', ['id']),
        index('lookup_index', ['studentId', 'sourceName'], false),
        index('other_unique', ['studentId', 'sourceName', 'subject']),
    ]);
    await removeLegacyStudentVideoIndexes(db);
    assert.deepEqual(calls, [
        ['constraint', 'ALTER TABLE "student_videos" DROP CONSTRAINT IF EXISTS "legacy_index"'],
        ['index', 'legacy_index'],
        ['constraint', 'ALTER TABLE "student_videos" DROP CONSTRAINT IF EXISTS "legacy_constraint"'],
        ['index', 'legacy_constraint'],
    ]);
});

test('legacy index retirement is idempotent on subsequent startups', async () => {
    const { db, calls } = fakeDatabase([
        index('student_videos_student_subject_playlist_url_unique', ['studentId', 'subject', 'url']),
        index('student_videos_pkey', ['id']),
    ]);
    await removeLegacyStudentVideoIndexes(db);
    assert.deepEqual(calls, []);
});

test('index retirement failures prevent startup from proceeding', async () => {
    const { db } = fakeDatabase([index('legacy_index', ['studentId', 'sourceName'])]);
    db.query = async () => { throw new Error('Migration failed'); };
    await assert.rejects(removeLegacyStudentVideoIndexes(db), /Migration failed/);
});
