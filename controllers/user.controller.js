import models from '../models/index.model.js';
const { Users } = models;

export const getStudents = async (req, res) => {
    const { teacherId } = req.params;
    try {
        const students = await Users.findAll({
            where: { role: 'student', teacherId },
            attributes: { exclude: ['password'] },
        });
        return res.status(200).json({
            success: true,
            message: 'Öğretmene kayıtlı tüm öğrenciler.',
            students,
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
