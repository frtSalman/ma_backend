import models from '../models/index.model.js';
const { Users } = models;

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

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

// Add this to your existing user controller or create a new one

export const getParentStudents = async (req, res) => {
    try {
        const parentId = req.userId; // Assuming you get parent ID from JWT token

        // Verify user is a parent
        const parent = await Users.findOne({
            where: { id: parentId, role: 'parent' },
        });

        if (!parent) {
            return res.status(403).json({
                success: false,
                message: 'Only parents can access this endpoint',
            });
        }

        // Get all students belonging to this parent
        const students = await Users.findAll({
            where: { parentId: parentId, role: 'student' },
            attributes: { exclude: ['password'] }, // Don't expose passwords
        });

        res.status(200).json({
            success: true,
            message: 'Students retrieved successfully',
            students,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error while retrieving students',
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
