import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import models from '../models/index.model.js';
import {
    deleteVideoSourceURL,
    uploadVideoSourceURL,
} from '../controllers/studentVideos.controller.js';

const { StudentVideos } = models;
const videoUrl = id => `https://www.youtube.com/watch?v=${id}`;
const playlistItem = (id, title = `Video ${id}`) => ({
    snippet: {
        title,
        resourceId: { videoId: id },
        videoOwnerChannelTitle: 'Kanal',
    },
});
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

const setup = (t, { existing = [], pages = [[]], unavailable = [] } = {}) => {
    const previousKey = process.env.YOUTUBE_API_KEY;
    process.env.YOUTUBE_API_KEY = 'test-key';
    t.after(() => {
        if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
        else process.env.YOUTUBE_API_KEY = previousKey;
    });

    const queries = [];
    const inserted = [];
    const bulkOptions = [];
    const apiCalls = [];
    t.mock.method(StudentVideos, 'findAll', async options => {
        queries.push(options);
        const { where } = options;
        return existing.filter(video =>
            video.studentId === where.studentId &&
            video.subject === where.subject &&
            (!where['playList.id'] ||
                video.playList?.id === where['playList.id'])
        );
    });
    t.mock.method(StudentVideos, 'bulkCreate', async (videos, options) => {
        inserted.push(...videos);
        bulkOptions.push(options);
        return videos;
    });
    t.mock.method(StudentVideos, 'create', async video => {
        inserted.push(video);
        return video;
    });
    t.mock.method(axios, 'get', async apiUrl => {
        const parsed = new URL(apiUrl);
        apiCalls.push(parsed);
        if (parsed.pathname.endsWith('/playlistItems')) {
            const page = Number(parsed.searchParams.get('pageToken') || 0);
            return {
                data: {
                    items: pages[page],
                    ...(page + 1 < pages.length
                        ? { nextPageToken: String(page + 1) }
                        : {}),
                },
            };
        }
        assert.ok(parsed.pathname.endsWith('/videos'));
        return {
            data: {
                items: parsed.searchParams.get('id').split(',')
                    .filter(id => !unavailable.includes(id))
                    .map(id => ({
                        id,
                        contentDetails: { duration: 'PT1H2M3S' },
                    })),
            },
        };
    });

    const body = {
        studentId: 'student-1',
        subject: 'Matematik',
        type: 'playlist',
        ytId: 'playlist-b',
        name: 'Liste B',
    };
    return { body, queries, inserted, bulkOptions, apiCalls };
};

test('imports a shared video into a different playlist without changing progress', async t => {
    const existing = [{
        studentId: 'student-1',
        subject: 'Matematik',
        url: videoUrl('shared'),
        sourceName: 'Ortak video',
        playList: { id: 'playlist-a' },
        isWatched: true,
        lastConfirmedMoment: 120,
    }];
    const fixture = setup(t, {
        existing,
        pages: [[playlistItem('shared', 'Ortak video')]],
    });
    const res = response();
    await uploadVideoSourceURL({ body: fixture.body }, res);

    assert.equal(res.body.success, true);
    assert.equal(fixture.inserted.length, 1);
    assert.equal(fixture.inserted[0].url, existing[0].url);
    assert.equal(fixture.inserted[0].sourceName, existing[0].sourceName);
    assert.deepEqual(fixture.inserted[0].playList, {
        id: 'playlist-b', position: 0, playlistTitle: 'Liste B',
    });
    assert.equal(fixture.inserted[0].duration, 3723);
    assert.equal(fixture.inserted[0].isWatched, false);
    assert.equal(existing[0].isWatched, true);
    assert.equal(existing[0].lastConfirmedMoment, 120);
    assert.deepEqual(fixture.queries[0], {
        attributes: ['url'],
        where: {
            studentId: 'student-1', subject: 'Matematik',
            'playList.id': 'playlist-b',
        },
        raw: true,
    });
    assert.deepEqual(fixture.bulkOptions, [{ ignoreDuplicates: true }]);
});

test('imports a standalone video into a playlist', async t => {
    const fixture = setup(t, {
        existing: [{
            studentId: 'student-1', subject: 'Matematik',
            url: videoUrl('shared'), playList: null,
        }],
        pages: [[playlistItem('shared')]],
    });
    const res = response();
    await uploadVideoSourceURL({ body: fixture.body }, res);
    assert.equal(res.body.success, true);
    assert.equal(fixture.inserted.length, 1);
});

test('skips existing and repeated videos only within the target playlist', async t => {
    const fixture = setup(t, {
        existing: [{
            studentId: 'student-1', subject: 'Matematik',
            url: videoUrl('existing'), playList: { id: 'playlist-b' },
        }],
        pages: [
            [playlistItem('existing'), playlistItem('private', 'Private video'),
                { snippet: { title: 'Missing ID' } }, playlistItem('new')],
            [playlistItem('new'), playlistItem('deleted', 'Deleted video'),
                playlistItem('last'), playlistItem('unavailable')],
        ],
        unavailable: ['unavailable'],
    });
    const res = response();
    await uploadVideoSourceURL({ body: fixture.body }, res);
    assert.equal(res.body.success, true);
    assert.deepEqual(fixture.inserted.map(video => video.url), [
        videoUrl('new'), videoUrl('last'),
    ]);
    assert.deepEqual(fixture.inserted.map(video => video.playList.position), [3, 6]);
    const detailsCalls = fixture.apiCalls.filter(call => call.pathname.endsWith('/videos'));
    assert.equal(detailsCalls.length, 1);
    assert.equal(detailsCalls[0].searchParams.get('id'), 'new,last,unavailable');
});

test('allows the same playlist video for a different subject or student', async t => {
    const fixture = setup(t, {
        existing: [
            { studentId: 'student-1', subject: 'Fizik', url: videoUrl('shared'),
                playList: { id: 'playlist-b' } },
            { studentId: 'student-2', subject: 'Matematik', url: videoUrl('shared'),
                playList: { id: 'playlist-b' } },
        ],
        pages: [[playlistItem('shared')]],
    });
    const res = response();
    await uploadVideoSourceURL({ body: fixture.body }, res);
    assert.equal(res.body.success, true);
    assert.equal(fixture.inserted.length, 1);
});

test('does not request details or insert when a playlist was already imported', async t => {
    const fixture = setup(t, {
        existing: [{
            studentId: 'student-1', subject: 'Matematik',
            url: videoUrl('existing'), playList: { id: 'playlist-b' },
        }],
        pages: [[playlistItem('existing')]],
    });
    const res = response();
    await uploadVideoSourceURL({ body: fixture.body }, res);
    assert.equal(res.body.success, false);
    assert.equal(fixture.inserted.length, 0);
    assert.equal(fixture.apiCalls.length, 1);
});

test('fetches video details in batches of at most 50', async t => {
    const items = Array.from({ length: 51 }, (_, i) => playlistItem(`video-${i}`));
    const fixture = setup(t, { pages: [items.slice(0, 50), items.slice(50)] });
    const res = response();
    await uploadVideoSourceURL({ body: fixture.body }, res);
    assert.equal(res.body.success, true);
    assert.equal(fixture.inserted.length, 51);
    const detailsCalls = fixture.apiCalls.filter(call => call.pathname.endsWith('/videos'));
    assert.deepEqual(detailsCalls.map(call => call.searchParams.get('id').split(',').length), [50, 1]);
    assert.equal(fixture.inserted[50].playList.position, 50);
    assert.equal(fixture.bulkOptions.length, 1);
});

test('preserves duplicate checking for standalone uploads', async t => {
    const fixture = setup(t, {
        existing: [{
            studentId: 'student-1', subject: 'Matematik',
            url: videoUrl('shared'), playList: { id: 'playlist-a' },
        }],
    });
    const res = response();
    await uploadVideoSourceURL({ body: {
        ...fixture.body, type: 'video', ytId: 'shared', url: videoUrl('shared'),
    } }, res);
    assert.equal(res.body.success, false);
    assert.equal(fixture.apiCalls.length, 0);
    assert.equal(fixture.inserted.length, 0);
    assert.equal(fixture.queries[0].where['playList.id'], undefined);
});

test('still creates new standalone videos', async t => {
    const fixture = setup(t);
    const res = response();
    await uploadVideoSourceURL({ body: {
        ...fixture.body, type: 'video', ytId: 'new', url: videoUrl('new'),
    } }, res);
    assert.equal(res.body.success, true);
    assert.equal(fixture.inserted.length, 1);
    assert.equal(fixture.inserted[0].duration, 3723);
    assert.equal(fixture.inserted[0].playList, undefined);
});

test('does not persist partial playlists when a details batch fails', async t => {
    const items = Array.from({ length: 51 }, (_, i) => playlistItem(`video-${i}`));
    const fixture = setup(t, { pages: [items] });
    const get = axios.get;
    t.mock.method(axios, 'get', async url => {
        if (new URL(url).searchParams.get('id') === 'video-50') {
            throw new Error('YouTube unavailable');
        }
        return get(url);
    });
    const res = response();
    await uploadVideoSourceURL({ body: fixture.body }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(fixture.inserted.length, 0);
});

test('deleting a standalone video keeps playlist copies', async t => {
    const destroy = t.mock.method(StudentVideos, 'destroy', async () => 1);
    const res = response();
    await deleteVideoSourceURL({ body: {
        studentId: 'student-1', subject: 'Matematik', url: videoUrl('shared'),
    } }, res);
    assert.equal(res.body.success, true);
    assert.deepEqual(destroy.mock.calls[0].arguments[0].where, {
        studentId: 'student-1', subject: 'Matematik',
        url: videoUrl('shared'), playList: null,
    });
});

test('playlist deletion is scoped to student, subject and playlist', async t => {
    const destroy = t.mock.method(StudentVideos, 'destroy', async () => 1);
    await deleteVideoSourceURL({ body: {
        studentId: 'student-1', subject: 'Matematik', playList: { id: 'playlist-b' },
    } }, response());
    assert.deepEqual(destroy.mock.calls[0].arguments[0].where, {
        studentId: 'student-1', subject: 'Matematik', 'playList.id': 'playlist-b',
    });
});

test('deletion remains compatible with requests without a subject', async t => {
    const destroy = t.mock.method(StudentVideos, 'destroy', async () => 1);
    const res = response();
    await deleteVideoSourceURL({ body: {
        studentId: 'student-1', playList: { id: 'playlist-b' },
    } }, res);
    assert.equal(res.body.success, true);
    assert.deepEqual(destroy.mock.calls[0].arguments[0].where, {
        studentId: 'student-1', 'playList.id': 'playlist-b',
    });
});
