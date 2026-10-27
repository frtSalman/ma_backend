import axios from 'axios';
import models from '../models/index.model.js';

const { Users, StudentVideos, StudentVideoQuestions } = models;

const parseISO8601Duration = duration => {
    if (!duration) return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    match.shift(); // remove full match
    const [hours, minutes, seconds] = match.map(val => parseInt(val || 0, 10));
    return hours * 3600 + minutes * 60 + seconds;
};

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

const getPlaylistPosition = video => {
    const position = video.playList?.position;
    return Number.isInteger(position) ? position : Number.MAX_SAFE_INTEGER;
};

const sortVideoSources = (firstVideo, secondVideo) => {
    const subjectCompare = firstVideo.subject.localeCompare(
        secondVideo.subject
    );
    if (subjectCompare !== 0) return subjectCompare;

    const firstPlaylistId = firstVideo.playList?.id || '';
    const secondPlaylistId = secondVideo.playList?.id || '';
    if (firstPlaylistId && firstPlaylistId === secondPlaylistId) {
        const positionCompare =
            getPlaylistPosition(firstVideo) - getPlaylistPosition(secondVideo);
        if (positionCompare !== 0) return positionCompare;
    }

    return new Date(firstVideo.createdAt) - new Date(secondVideo.createdAt);
};

export const getVideoSources = async (req, res) => {
    const { studentId } = req.params;
    try {
        if (!studentId) {
            return res.status(404).json({
                success: false,
                message: 'Öğrenci bulunamadı.',
            });
        }

        const videos = await StudentVideos.findAll({
            where: { studentId },
            order: [
                ['subject', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        });

        const sortedVideos = videos.sort(sortVideoSources);

        return res.status(200).json({
            success: true,
            message: 'Video kaynakları getirildi.',
            videos: sortedVideos,
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const getVideoQuestions = async (req, res) => {
    const { videoId } = req.params;
    try {
        if (!videoId) {
            return res.status(404).json({
                success: false,
                message: 'Video bulunamadı.',
            });
        }

        const videoQuestions = await StudentVideoQuestions.findOne({
            where: { videoId },
        });

        return res.status(200).json({
            success: true,
            message: 'Video soruları getirildi.',
            videoQuestions,
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const uploadVideoSourceURL = async (req, res) => {
    const {
        studentId,
        subject,
        url,
        type,
        ytId,
        name,
        examType = null,
    } = req.body;

    try {
        if (!studentId) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        const existingVideos = await StudentVideos.findAll({
            attributes: ['url'],
            where: {
                studentId,
                subject,
                ...(type === 'playlist' && ytId ? { 'playList.id': ytId } : {}),
            },
            raw: true,
        });

        const existingUrls = new Set(existingVideos.map(v => v.url));

        const ytApiKey = process.env.YOUTUBE_API_KEY;
        if (!ytApiKey) {
            return res.status(500).json({
                success: false,
                message: 'YouTube API anahtarı yapılandırılmamış.',
            });
        }

        if (type === 'playlist' && ytId) {
            const playListId = new Date().getTime();
            let allPlaylistItems = [];
            let nextPageToken = '';
            let fetchMore = true;

            while (fetchMore) {
                const pageTokenParam = nextPageToken
                    ? `&pageToken=${nextPageToken}`
                    : '';
                const ytApiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${ytId}&key=${ytApiKey}${pageTokenParam}`;

                try {
                    const response = await axios.get(ytApiUrl);
                    allPlaylistItems = allPlaylistItems.concat(
                        response.data.items
                    );
                    nextPageToken = response.data.nextPageToken;
                    if (!nextPageToken) fetchMore = false;
                } catch (playlistError) {
                    return res.status(500).json({
                        success: false,
                        message:
                            'YouTube oynatma listesi alınırken bir hata oluştu. IDyi kontrol edin.',
                    });
                }
            }

            let newVideosToInsert = [];

            const newVideoItems = allPlaylistItems.reduce(
                (items, item, index) => {
                    const title = item.snippet.title;
                    if (
                        !item.snippet.resourceId ||
                        !item.snippet.resourceId.videoId
                    ) {
                        return items;
                    }

                    const videoUrl = `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`;

                    // Yalnızca bu oynatma listesindeki tekrarları atla.
                    if (
                        !existingUrls.has(videoUrl) &&
                        title !== 'Private video' &&
                        title !== 'Deleted video'
                    ) {
                        items.push({ item, position: index });
                        // Videoyu bulduğumuz için Set'e ekliyoruz ki aynı liste içinde tekrar çıkarsa atlasın
                        existingUrls.add(videoUrl);
                    }
                    return items;
                },
                []
            );

            if (newVideoItems.length > 0) {
                const CHUNK_SIZE = 50;
                for (let i = 0; i < newVideoItems.length; i += CHUNK_SIZE) {
                    const chunk = newVideoItems.slice(i, i + CHUNK_SIZE);
                    const videoIds = chunk
                        .map(({ item }) => item.snippet.resourceId.videoId)
                        .join(',');
                    const ytDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${ytApiKey}`;

                    try {
                        const detailsResponse = await axios.get(ytDetailsUrl);
                        const videoDetailsMap = new Map(
                            detailsResponse.data.items.map(item => [
                                item.id,
                                item.contentDetails,
                            ])
                        );

                        for (const { item, position } of chunk) {
                            const videoId = item.snippet.resourceId.videoId;
                            const videoDetails = videoDetailsMap.get(videoId);
                            if (videoDetails) {
                                const durationInSeconds = parseISO8601Duration(
                                    videoDetails.duration
                                );
                                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                                const title = item.snippet.title;

                                newVideosToInsert.push({
                                    sourceName: title,
                                    url: videoUrl,
                                    isWatched: false,
                                    studentId,
                                    subject,
                                    duration: durationInSeconds,
                                    lastConfirmedMoment: 0,
                                    playList: {
                                        id: ytId,
                                        position,
                                        playlistTitle:
                                            name ||
                                            item.snippet
                                                .videoOwnerChannelTitle +
                                                ' Oynatma Listesi ' +
                                                playListId,
                                    },
                                    examType: examType || null,
                                });
                            }
                        }
                    } catch (apiError) {
                        return res.status(500).json({
                            success: false,
                            message:
                                'YouTube video detayları alınırken bir hata oluştu.',
                        });
                    }
                }
            }

            if (newVideosToInsert.length > 0) {
                await StudentVideos.bulkCreate(newVideosToInsert, {
                    ignoreDuplicates: true,
                });
            } else {
                return res.json({
                    success: false,
                    message:
                        'Listedeki tüm geçerli videolar zaten eklenmiş veya liste boş.',
                });
            }
        } else {
            // Tekli video ekleme mantığı
            if (existingUrls.has(url)) {
                return res.json({
                    success: false,
                    message: 'Bu video kaynağı zaten eklenmiş.',
                });
            }

            if (!ytId) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Tekli video yüklemek için video IDsi (ytId) gerekli.',
                });
            }

            const ytDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ytId}&key=${ytApiKey}`;

            try {
                const detailsResponse = await axios.get(ytDetailsUrl);
                if (
                    !detailsResponse.data.items ||
                    detailsResponse.data.items.length === 0
                ) {
                    return res.status(404).json({
                        success: false,
                        message: 'YouTube videosu bulunamadı.',
                    });
                }

                const videoDetails =
                    detailsResponse.data.items[0].contentDetails;
                const durationInSeconds = parseISO8601Duration(
                    videoDetails.duration
                );

                await StudentVideos.create({
                    sourceName: name,
                    url,
                    isWatched: false,
                    studentId,
                    subject,
                    duration: durationInSeconds,
                    lastConfirmedMoment: 0,
                    examType: examType || null,
                });
            } catch (apiError) {
                return res.status(500).json({
                    success: false,
                    message:
                        'YouTube video detayları alınırken bir hata oluştu.',
                });
            }
        }

        res.json({
            success: true,
            message:
                type === 'playlist'
                    ? 'Oynatma listesi başarıyla eklendi.'
                    : 'Video kaynağı oluşturuldu.',
        });
    } catch (error) {
        console.error('Video upload error: ', error.message);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const updateVideoStatus = async (req, res) => {
    const { url, studentId } = req.body;

    try {
        if (!studentId) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        // Corrected usage of StudentVideos.update
        await StudentVideos.update(
            { isWatched: true }, // 1. Values to update
            { where: { studentId, url } } // 2. Options with where clause
        );

        res.json({
            success: true,
            message: 'Video kaynağı güncellendi.',
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const deleteVideoSourceURL = async (req, res) => {
    const { url, subject, studentId, playList } = req.body;

    try {
        if (!studentId) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        const scope = { studentId, ...(subject ? { subject } : {}) };
        if (playList) {
            await StudentVideos.destroy({
                where: { ...scope, 'playList.id': playList.id },
            });
        } else {
            await StudentVideos.destroy({
                where: { ...scope, url, playList: null },
            });
        }

        res.json({
            success: true,
            message: 'Video kaynağı silindi.',
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};
