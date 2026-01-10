import Exam from '../models/exam.model.js';

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

export const getExamResult = async (req, res) => {
    const { id } = req.params;

    try {
        const examResult = await Exam.findOne({ where: { id } });

        res.json({
            success: true,
            message: 'Sınav Sonucu bulundu.',
            examResult,
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
    const { path, id } = req.body;
    const deleteUrl = `https://${baseHost}/${BUNNY_ZONE}/examResults/${path}`;

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
