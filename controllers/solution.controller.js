import axios from 'axios';
import models from '../models/index.model.js';

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

const { Solution, Users } = models;

const IMAGE_EXTENSIONS = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

const VIDEO_EXTENSIONS = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-matroska': 'mkv',
};

const getFileCategory = mimetype => {
    if (mimetype?.startsWith('image/')) return 'images';
    if (mimetype?.startsWith('video/')) return 'videos';
    return null;
};

const getFileExtension = mimetype =>
    IMAGE_EXTENSIONS[mimetype] || VIDEO_EXTENSIONS[mimetype] || null;

export async function getSolution(req, res) {
    const { qId } = req.params;

    try {
        const record = await Solution.findOne({
            where: { qId },
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Çözüm henüz yüklenmemiş.',
            });
        }

        return res.status(200).json({
            success: true,
            data: record,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
}

export const postSolution = async (req, res) => {
    const { qId, studentId, unsolvedQURL } = req.body;
    const teacherId = req.userId;

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Herhangi bir dosya yüklenmedi.',
        });
    }

    const fileCategory = getFileCategory(req.file.mimetype);
    const fileExtension = getFileExtension(req.file.mimetype);

    if (!fileCategory || !fileExtension) {
        return res.status(400).json({
            success: false,
            message: 'Sadece fotoğraf veya video dosyaları yüklenebilir.',
        });
    }

    if (!unsolvedQURL) {
        return res.status(400).json({
            success: false,
            message: 'unsolvedQURL bilgisi eksik.',
        });
    }

    const path = new URL(unsolvedQURL).pathname;
    const solutionFileWay = path.substring(1, path.lastIndexOf('/'));

    try {
        const fileName = `${Date.now()}.${fileExtension}`;
        const uniqueName = `${solutionFileWay}/${fileName}`;
        const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/${uniqueName}`;
        const pullZoneURL = `https://cdn.teachflow.net/${uniqueName}`;

        console.trace('Bunnycdn yükleme başladı');

        await axios.put(uploadUrl, req.file.buffer, {
            headers: {
                AccessKey: KEY,
                'Content-Type': req.file.mimetype,
            },
        });

        console.trace(uniqueName);

        const solution = await Solution.create({
            path,
            studentId,
            teacherId,
            qId,
            solutionContentLink: pullZoneURL,
            createdAt: new Date().toISOString(),
        });

        console.trace(solution);

        return res.json({
            success: true,
            message: `Çözüm içeriği başarıyla yüklendi.`,
            data: solution,
        });
    } catch (error) {
        console.error('Yükleme hatası:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu veya BunnyCDN bağlantısı başarısız.',
        });
    }
};

export const deleteSolution = async (req, res) => {
    const { qId } = req.params;

    try {
        const record = await Solution.findOne({
            where: { qId },
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Silinecek çözüm bulunamadı.',
            });
        }

        if (record.solutionContentLink) {
            const filePath = new URL(
                record.solutionContentLink
            ).pathname.substring(1);
            const deleteUrl = `https://${baseHost}/${BUNNY_ZONE}/${filePath}`;

            const bunnyResponse = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    AccessKey: KEY,
                },
            });

            if (!bunnyResponse.ok) {
                const bunnyError = await bunnyResponse.text();

                console.error('Bunny Storage silme hatası:', {
                    status: bunnyResponse.status,
                    statusText: bunnyResponse.statusText,
                    response: bunnyError,
                    deleteUrl,
                });

                throw new Error(
                    `Bunny Storage ${bunnyResponse.status}: ${bunnyError}`
                );
            }
        }

        await Solution.destroy({
            where: { qId },
        });

        return res.status(200).json({
            success: true,
            message: 'Çözüm başarıyla silindi.',
        });
    } catch (error) {
        console.error('deleteSolution error:', error);

        return res.status(500).json({
            success: false,
            message: 'Çözüm silinirken sunucu hatası oluştu.',
            error:
                process.env.NODE_ENV === 'development'
                    ? error.message
                    : undefined,
        });
    }
};
