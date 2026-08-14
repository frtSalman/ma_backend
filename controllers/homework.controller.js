import models from '../models/index.model.js';
import sequelize from '../utils/database.js';

const { Homework, Users } = models;

export const getStudentHomeworks = async (req, res) => {
    const { role, userId, studentId } = req.query;

    try {
        let homeworks;

        if (role === 'teacher' && studentId !== undefined) {
            homeworks = await Homework.findAll({
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
            homeworks = await Homework.findAll({
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
            homeworks = await Homework.findAll({
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
            message: 'İlgili öğretmenin verdiği ödevler',
            homeworks,
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

export const getAllHomeworks = async (req, res) => {
    const { teacherId } = req.params;

    try {
        const homeworks = await Homework.findAll({
            where: { teacherId },
            include: [
                {
                    model: Users,
                    as: 'student',
                    attributes: ['name'], // Select specific fields
                },
            ],
        });
        return res.status(200).json({
            success: true,
            message: 'İlgili öğretmenin verdiği ödevler',
            homeworks,
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

export const addHomework = async (req, res) => {
    const { homework } = req.body;

    try {
        const result = await Homework.create({
            ...homework,
        });

        res.status(200).json({
            success: true,
            massage: 'İlgili öğretmenin verdiği ödev eklendi.',
            data: result,
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

export const deleteHomework = async (req, res) => {
    const { id } = req.params;

    try {
        // Attempt to delete the row
        const deletedCount = await Homework.destroy({
            where: { id },
        });

        if (deletedCount === 0) {
            // No rows matched that id
            return res.status(404).json({
                success: false,
                message: 'Silinecek ödev bulunamadı.',
            });
        }

        // Successfully deleted
        return res.status(200).json({
            success: true,
            message: 'Ödev başarıyla silindi.',
            deletedId: id,
        });
    } catch (error) {
        console.trace(error);
        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const updateHomework = async (req, res) => {
    const { homework } = req.body;

    try {
        await Homework.update(
            {
                homeworkContent: homework.homeworkContent,
                period: homework.period,
                program: homework.program,
                homeworkDayNum: homework.homeworkDayNum,
                homeworkDeadline: homework.homeworkDeadline,
                homeworkStatus: homework.homeworkStatus,
                homeworkFilePath: homework.homeworkFilePath,
                teacherId: homework.teacherId,
            },
            { where: { id: homework.id } }
        );

        res.status(200).json({
            success: true,
            message: 'Ödev güncellenmiştir.',
        });
    } catch (error) {
        console.trace(error);
        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

/* export const updateHomeworkStatus = async (req, res) => {
    const { id: homeworkId, day } = req.params;

    if (!day || typeof day !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Güncellenecek gün belirtilmedi veya geçersiz.',
        });
    }

    try {
        let affectedRows;
        if (day === '***') {
            affectedRows = await Homework.update(
                {
                    homeworkStatus: true,
                },
                {
                    where: { id: homeworkId },
                }
            );
        } else {
            affectedRows = await Homework.update(
                {
                    program: sequelize.literal(
                        `jsonb_set(program, '{${day}, checked}', 'true')`
                    ),
                },
                {
                    where: { id: homeworkId },
                }
            );
        }

        if (affectedRows[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Belirtilen ID ile eşleşen ödev bulunamadı.',
            });
        }

        // 5. Send a success response
        res.status(200).json({
            success: true,
            message: `"${day}" günü için ödev durumu başarıyla güncellendi.`,
        });
    } catch (error) {
        console.trace(error);
        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
}; */
