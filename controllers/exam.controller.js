import axios from 'axios';
import models from '../models/index.model.js';
import { processExamData } from '../pipeline/mainProcessor.js';

const { Exam, Users } = models;

const n8nWebhookUrl =
    process.env.NODE_ENV === 'production'
        ? 'https://n8n.teachflow.net/webhook/84259f1b-da3d-4a5e-9a97-11d852f1f4ad'
        : 'https://n8n.teachflow.net/webhook-test/84259f1b-da3d-4a5e-9a97-11d852f1f4ad';

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
    const { studentId } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Herhangi bir dosya yüklenmedi.',
        });
    }

    try {
        const student = await Users.findOne({
            where: { id: studentId },
        });

        const examPromises = req.files.map(async file => {
            // İsim çakışmasını önlemek için index'i de ekliyoruz
            const originalName = file.originalname || file.name;
            const fileName = `${student.name}/examResults/${Date.now()}-Exam_result-${originalName}`;
            const safeFilename = fileName.replace(/\s+/g, '-');
            const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/${safeFilename}`;
            const pullZoneURL = `https://cdn.teachflow.net/${safeFilename}`;

            // 1. BunnyCDN'e Yükle
            await axios.put(uploadUrl, file.buffer, {
                headers: {
                    AccessKey: KEY,
                    'Content-Type': file.mimetype,
                },
            });

            // 3. Her bir dosya için path ve id döndür
            const aiJsonPayload = axios.post(n8nWebhookUrl, {
                path: pullZoneURL,
            });

            const results = await processExamData(
                aiJsonPayload.data,
                student?.grade
            );

            const resultSubjects = results.map(result => result.subject);

            const uniqueSubjects = [...new Set(resultSubjects)];

            const analysis = {};

            uniqueSubjects.forEach(subject => {
                const subjectResults = results.filter(
                    result => result.subject === subject
                );
                analysis[subject] = subjectResults;
            });

            return await Exam.create({
                studentId: studentId,
                teacherId: student?.teacherId,
                path: url,
                analysis: results,
                scoreSummary: aiJsonPayload?.scoreSummary,
                examTitle: aiJsonPayload?.header?.examTitle,
                examDate: aiJsonPayload?.header?.examDate,
                totalPoint: aiJsonPayload?.header?.totalPoint,
            });
        });

        await Promise.all(examPromises);

        res.json({
            success: true,
            message: 'Deneme sonucu oluşturuldu.',
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: !studentId
                ? 'Lütfen bir öğrenci seçiniz.'
                : 'Sunucu hatası oluştu.',
        });
    }
};

export const examOCRTest = async (req, res) => {
    const { path, grade } = req.body;

    try {
        // 4. n8n Webhook'u tetikle
        const aiJsonPayload = await axios.post(n8nWebhookUrl, {
            path: path,
        });

        const result = await processExamData(aiJsonPayload.data, grade);

        res.json({
            success: true,
            message: 'Deneme sonucu test edildi.',
            result,
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: !path
                ? 'Lütfen bir dosya seçiniz.'
                : 'Sunucu hatası oluştu.',
        });
    }
};

export const deleteExamURL = async (req, res) => {
    const { path, id, studentName } = req.body;
    console.log(
        'Deleting exam result with path:',
        path,
        'and id:',
        id,
        'for student:',
        studentName
    );

    const safeStudentName = studentName.replace(/\s+/g, '-');

    const deleteUrl = `https://${baseHost}/${BUNNY_ZONE}/${safeStudentName}/${path}`;

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
