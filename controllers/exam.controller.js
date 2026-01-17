import Exam from '../models/exam.model.js';
import Users from '../models/user.model.js';

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

export const getExamResults = async (req, res) => {
    const { role, userId, studentId } = req.query;

    console.log(role, userId, studentId);

    try {
        let exams;

        if (role === 'teacher' && studentId !== undefined) {
            console.trace(studentId);
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
        if (role === 'student') {
            exams = await Exam.findAll({
                where: { studentId: userId },
                include: [
                    {
                        model: Users,
                        as: 'student',
                        attributes: ['name'], // Select specific fields
                    },
                    {
                        model: Users,
                        as: 'teacher',
                        attributes: ['grade', 'name'], // Select specific fields
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
            message: 'Sunucu hatası oluştu.',
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
