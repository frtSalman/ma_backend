import Exam from '../models/exam.model.js';
import Users from '../models/user.model.js';
import axios from 'axios';

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

export const getExamResults = async (req, res) => {
    const { role, userId, studentId } = req.query;

    try {
        let exams;

        if (role === 'teacher' && studentId !== undefined) {
            exams = await Exam.findAll({
                where: { teacherId: userId, studentId },
                include: [
                    {
                        model: Users,
                        as: 'student',
                        attributes: ['name'], // Select specific fields
                    },
                ],
            });
        }
        if (role === 'parent' && studentId !== undefined) {
            exams = await Exam.findAll({
                where: { studentId },
                include: [
                    {
                        model: Users,
                        as: 'student',
                        attributes: ['name'], // Select specific fields
                    },
                ],
            });
        }
        if (role === 'student') {
            exams = await Exam.findAll({
                where: { studentId: userId },
                include: [
                    {
                        model: Users,
                        as: 'student',
                        attributes: ['name'], // Select specific fields
                    },
                ],
            });
        }
        return res.status(200).json({
            success: true,
            message: 'İlgili öğrencinin deneme sonuçları',
            exams,
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

export const uploadExam = async (req, res) => {
    const { studentName } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Herhangi bir dosya yüklenmedi.',
        });
    }

    try {
        const uploadPromises = req.files.map(async file => {
            // İsim çakışmasını önlemek için index'i de ekliyoruz
            const originalName = file.originalname || file.name;
            const fileName = `${studentName}/${Date.now()}-Exam_result-${originalName}`;
            const safeFilename = fileName.replace(/\s+/g, '-');
            const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/examResults/${safeFilename}`;
            const pullZoneURL = `https://cdn.teachflow.net/examResults/${safeFilename}`;

            // 1. BunnyCDN'e Yükle
            await axios.put(uploadUrl, file.buffer, {
                headers: {
                    AccessKey: KEY,
                    'Content-Type': file.mimetype,
                },
            });

            // 3. Her bir dosya için path ve id döndür
            return pullZoneURL;
        });

        // Tüm paralel işlemlerin bitmesini bekle
        const pullZoneURLs = await Promise.all(uploadPromises);

        res.json({
            success: true,
            message: 'Deneme sonucu URL oluşturuldu.',
            filePaths: pullZoneURLs,
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: !studentName
                ? 'Lütfen bir öğrenci seçiniz.'
                : 'Sunucu hatası oluştu.',
        });
    }
};

export const deleteExamURL = async (req, res) => {
    const { path, id, studentName } = req.body;
    const deleteUrl = `https://${baseHost}/${BUNNY_ZONE}/examResults/${studentName}/${path}`;

    try {
        await Exam.destroy({
            where: { id },
        });

        await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                AccessKey: KEY,
            },
        });

        res.json({
            success: true,
            message: 'Deneme sonucu silindi.',
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

export const updateExam = async (req, res) => {
    const id = req.params.id;
    const { analysis, scoreSummary, examTitle, examDate, totalPoint } =
        req.body.data;

    try {
        await Exam.update(
            {
                analysis,
                scoreSummary,
                examTitle,
                examDate,
                totalPoint,
            },
            { where: { id: id } }
        );

        res.status(200).json({
            success: true,
            message: 'Deneme sonucu güncellenmiştir.',
        });
    } catch (error) {
        console.trace(error);
        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};
