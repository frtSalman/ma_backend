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

export const deleteParent = async (req, res) => {
    const { teacherId, parentId } = req.params;
    console.trace(req.params);
    try {
        const parent = await Users.findOne({
            where: { role: 'student', id: parentId, teacherId },
        });

        await parent.destroy();

        return res.status(200).json({
            success: true,
            message: 'Öğrenci silindi.',
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
    const pullZoneURL = `https://cdn.teachflow.net//logo/${name}/${uniqueName}`;

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
