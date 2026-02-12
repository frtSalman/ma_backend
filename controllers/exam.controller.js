import Exam from '../models/exam.model.js';
import Users from '../models/user.model.js';

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
        console.trace(exams);
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

export const uploadExamURL = async (req, res) => {
    const { studentName, fileName } = req.body;

    const uniqueName = `${Date.now()}-Exam_result-${fileName}`;

    const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/examResults/${studentName}/${uniqueName}`;
    const pullZoneURL = `https://cdn.teachflow.net/examResults/${studentName}/${uniqueName}`;

    console.trace(uniqueName);

    try {
        res.json({
            success: true,
            message: 'Deneme sonucu URL oluşturuldu.',
            uploadUrl,
            pullZoneURL,
            filePath: uniqueName,
            key: KEY,
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

        res.json({
            success: true,
            message: 'Deneme sonucu silindi.',
            deleteUrl,
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
