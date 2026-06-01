import axios from 'axios';
import models from '../models/index.model.js';
const { Users } = models;

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

export const getStudents = async (req, res) => {
    const { role, id } = req.params;
    console.log(role, id);
    try {
        if (role === 'teacher') {
            const students = await Users.findAll({
                where: { role: 'student', teacherId: id },
                attributes: { exclude: ['password'] },
            });
            return res.status(200).json({
                success: true,
                message: 'Öğretmene kayıtlı tüm öğrenciler.',
                students,
            });
        }

        if (role === 'parent') {
            const students = await Users.findAll({
                where: { role: 'student', parentId: id },
                attributes: { exclude: ['password'] },
            });
            return res.status(200).json({
                success: true,
                message: 'Velinin kayıtlı tüm öğrencileri.',
                students,
            });
        }
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const getParents = async (req, res) => {
    const { teacherId } = req.params;

    try {
        const parents = await Users.findAll({
            where: { role: 'parent', teacherId },
            attributes: { exclude: ['password'] },
        });
        return res.status(200).json({
            success: true,
            message: 'Öğretmene kayıtlı tüm veliler.',
            parents,
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

export const deleteParent = async (req, res) => {
    const { teacherId, parentId } = req.params;
    console.trace(req.params);
    try {
        const parent = await Users.findOne({
            where: { role: 'parent', id: parentId, teacherId },
        });

        await parent.destroy();

        return res.status(200).json({
            success: true,
            message: 'Veli silindi.',
            parent,
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

export const deleteStudent = async (req, res) => {
    const { teacherId, studentId } = req.params;
    console.trace(req.params);
    try {
        const student = await Users.findOne({
            where: { role: 'student', id: studentId, teacherId },
        });

        await student.destroy();

        return res.status(200).json({
            success: true,
            message: 'Öğrenci silindi.',
            student,
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

export const addLogoPath = async (req, res) => {
    const { id, name } = req.body;

    const safeFilename = `${name}`.replace(/\s+/g, '-');

    const uniqueName = `${Date.now()}-${safeFilename}-logo.webp`;

    const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/logo/${name}/${uniqueName}`;
    const pullZoneURL = `https://cdn.teachflow.net/logo/${name}/${uniqueName}`;

    try {
        await Users.update(
            { logo: pullZoneURL },
            {
                where: { id },
            }
        );

        return res.status(200).json({
            success: true,
            message: 'Logo eklendi.',
            uploadUrl,
            filePath: uniqueName,
            key: KEY,
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

export const getBookSources = async (req, res) => {
    const { studentId } = req.params;

    try {
        const student = await Users.findOne({
            where: { id: studentId, role: 'student' },
            attributes: { exclude: ['password'] },
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Öğrenci bulunamadı.',
            });
        }

        const bookSources = student.books || {};

        return res.status(200).json({
            success: true,
            message: 'Kitap kaynakları getirildi.',
            bookSources,
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Sunucu hatası oluştu.',
        });
    }
};

export const getVideoSources = async (req, res) => {
    const { studentId } = req.params;
    try {
        const student = await Users.findOne({
            where: { id: studentId, role: 'student' },
            attributes: { exclude: ['password'] },
        });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Öğrenci bulunamadı.',
            });
        }
        const videoSources = student.videos || {};
        return res.status(200).json({
            success: true,
            message: 'Video kaynakları getirildi.',
            videoSources,
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const uploadBookSource = async (req, res) => {
    // FIX: Pull sourceName from req.body
    const { studentName, studentId, subject, bookName } = req.body;
    const file = req.file;
    console.trace('Received file:', file);

    try {
        const student = await Users.findOne({
            where: { id: studentId, role: 'student' },
        });

        if (!student) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        let pullZoneURL = null;

        // FIX: Only process file logic IF a file actually exists
        if (file) {
            console.trace('Processing file upload logic...');
            // NOTE: If you use Multer, this should be file.originalname.
            // If express-fileupload, file.name. I'll use file.originalname as it's standard for Multer buffer uploads.
            const fileNameToUse = file.originalname || file.name;
            const uniqueName = `${Date.now()}-${fileNameToUse}`;

            const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/source/${studentName}/${subject}/${uniqueName}`;
            pullZoneURL = `https://cdn.teachflow.net/source/${studentName}/${subject}/${uniqueName}`;

            await axios.put(uploadUrl, file.buffer, {
                headers: {
                    AccessKey: KEY,
                    'Content-Type': file.mimetype,
                },
            });
        }

        // DETERMINING THE NAME: Use file name if available, otherwise use bookName from body
        const finalSourceName = file?.originalname || bookName;

        if (!finalSourceName) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin veya kitap adı girin.',
            });
        }

        const existingBooks = student.books || {};
        const updatedBookSources = { ...existingBooks };

        if (!updatedBookSources[subject]) {
            updatedBookSources[subject] = [];
        }

        // FIX: Check against the sourceName provided by the frontend, not the file name
        const isBookalreadyAdded = updatedBookSources[subject].some(
            bookItem => bookItem.sourceName === finalSourceName
        );

        if (isBookalreadyAdded) {
            return res.json({
                success: false,
                message: 'Bu kitap kaynağı zaten eklenmiş.',
            });
        }

        updatedBookSources[subject].push({
            sourceName: finalSourceName,
            url: pullZoneURL, // Will be the URL or null if no file was uploaded
            isChecked: false,
        });

        await Users.update(
            { books: updatedBookSources },
            { where: { id: studentId } }
        );

        res.json({
            success: true,
            message: 'Kitap kaynağı oluşturuldu.',
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            success: false,
            // FIX: Prevent ReferenceError by not relying on studentName in the catch block if it failed early
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const deleteBookSource = async (req, res) => {
    const { path, studentName, studentId, pullZoneURL, subject, sourceName } =
        req.body;

    if (path) {
        const deleteUrl = `https://${baseHost}/${BUNNY_ZONE}/source/${studentName}/${subject}/${path}`;

        try {
            await fetch(deleteUrl, {
                method: 'DELETE',
                headers: { AccessKey: KEY },
            });
        } catch (cdnError) {
            console.log(
                'File not found on CDN or CDN error, proceeding to DB deletion...'
            );
        }
    }

    try {
        const student = await Users.findOne({
            where: { id: studentId, role: 'student' },
        });

        if (!student) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        const existingBooks = student.books || {};

        let updatedBookSources = { ...existingBooks };

        const updatedSubjectBooks = updatedBookSources[subject].filter(
            bookItem => bookItem.url !== pullZoneURL
        );

        updatedBookSources[subject] = updatedSubjectBooks;

        await Users.update(
            {
                books: updatedBookSources,
            },
            {
                where: { id: studentId },
            }
        );

        res.json({
            success: true,
            message: 'Kitap kaynağı silindi.',
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

export const uploadVideoSourceURL = async (req, res) => {
    // Destructure the new type and ytId parameters sent from the frontend
    const { studentId, subject, url, type, ytId, name } = req.body;

    console.trace('Received video source upload request:', req.body);

    try {
        const student = await Users.findOne({
            where: { id: studentId, role: 'student' },
        });

        if (!student) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        const existingVideos = student.videos || {};
        const updatedVideoSources = { ...existingVideos };

        if (!updatedVideoSources[subject]) {
            updatedVideoSources[subject] = [];
        }

        if (type === 'playlist' && ytId) {
            const ytApiKey = process.env.YOUTUBE_API_KEY;

            const playListId = new Date().getTime(); // Generate a unique playlist ID based on timestamp

            if (!ytApiKey) {
                return res.status(500).json({
                    success: false,
                    message: 'YouTube API anahtarı yapılandırılmamış.',
                });
            }

            let allPlaylistItems = [];
            let nextPageToken = '';
            let fetchMore = true;

            // Fetch all videos in the playlist, handling YouTube's 50-item pagination limit
            while (fetchMore) {
                const pageTokenParam = nextPageToken
                    ? `&pageToken=${nextPageToken}`
                    : '';
                const ytApiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${ytId}&key=${ytApiKey}${pageTokenParam}`;

                const response = await axios.get(ytApiUrl);
                console.trace('YouTube API response:', response);
                allPlaylistItems = allPlaylistItems.concat(response.data.items);

                nextPageToken = response.data.nextPageToken;
                if (!nextPageToken) fetchMore = false;
            }

            let addedCount = 0;

            // Process each video and push to the JSON array
            allPlaylistItems.forEach((item, index) => {
                const videoUrl = `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`;

                // Use the actual YouTube video title, but prefix it with your subject/custom name for organization
                const title = item.snippet.title;

                const isVideoAlreadyAdded = updatedVideoSources[subject].some(
                    videoItem => videoItem.url === videoUrl
                );

                if (
                    !isVideoAlreadyAdded &&
                    title !== 'Private video' &&
                    title !== 'Deleted video'
                ) {
                    updatedVideoSources[subject].push({
                        sourceName: title,
                        url: videoUrl,
                        isWatched: false,
                        percentage: 0,
                        lastMoment: 0,
                        playlist: {
                            id: ytId,
                            playlistTitle:
                                name ||
                                item.snippet.videoOwnerChannelTitle +
                                    ' Oynatma Listesi ' +
                                    playListId, // Combine channel name and unique playlist ID for better identification
                        }, // Store playlist ID for reference
                    });
                    addedCount++;
                }
            });

            if (addedCount === 0) {
                return res.json({
                    success: false,
                    message: 'Listedeki tüm geçerli videolar zaten eklenmiş.',
                });
            }
        } else {
            // Standard single video upload logic
            const isVideoAlreadyAdded = updatedVideoSources[subject].some(
                videoItem => videoItem.url === url
            );

            if (isVideoAlreadyAdded) {
                return res.json({
                    success: false,
                    message: 'Bu video kaynağı zaten eklenmiş.',
                });
            }

            updatedVideoSources[subject].push({
                sourceName: name || url, // Use provided name or fallback to URL as sourceName
                url: url,
                isWatched: false,
                percentage: 0,
                lastMoment: 0,
            });
        }

        // Save the updated JSON object back to the database
        await Users.update(
            {
                videos: updatedVideoSources,
            },
            {
                where: { id: studentId },
            }
        );

        res.json({
            success: true,
            message:
                type === 'playlist'
                    ? 'Oynatma listesi başarıyla eklendi.'
                    : 'Video kaynağı oluşturuldu.',
        });
    } catch (error) {
        console.error(
            'Video upload error: ',
            error.response?.data || error.message
        );
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const deleteVideoSourceURL = async (req, res) => {
    const { url, videoSubject, studentId, playlistId } = req.body;

    try {
        const student = await Users.findOne({
            where: { id: studentId, role: 'student' },
        });

        if (!student) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        const existingVideos = student.videos || {};

        console.trace(playlistId);

        let updatedSubjectVideos;

        if (playlistId) {
            // If playlistId is provided, we want to remove all videos that belong to that playlist
            updatedSubjectVideos = existingVideos[videoSubject].filter(
                videoItem => videoItem.playlist?.id !== playlistId
            );
        } else {
            updatedSubjectVideos = existingVideos[videoSubject].filter(
                videoItem => videoItem.url !== url
            );
        }

        const updatedVideoSources = {
            ...existingVideos,
            [videoSubject]: updatedSubjectVideos,
        };

        await Users.update(
            {
                videos: updatedVideoSources,
            },
            {
                where: { id: studentId },
            }
        );

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
