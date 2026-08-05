import StudySchedule from '../models/studySchedule.model.js';
import getNearestDateForDay from '../utils/getNearestDateForDay.js';
import PDFDocument from 'pdfkit-table';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import generateScheduleDocDefinition from '../utils/generateScheduleDocDefinition.js';
import Users from '../models/user.model.js';

// ES Modülleri kullandığınız için __dirname tanımlayalım
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Denetleyici (controller) içinde font yolunu oluşturun
// Eğer bu kod controllers klasöründeyse, bir üst klasöre çıkıp public/fonts'a giriyoruz
const fontPath = path.join(__dirname, '..', 'public', 'font', 'Roboto.ttf');
// Font yolunun altına ekleyin
const logoPath = path.join(
    __dirname,
    '..',
    'public',
    'logo',
    'teachflow-favicon-192.png'
);

const weekDays = [
    'Pazartesi',
    'Salı',
    'Çarşamba',
    'Perşembe',
    'Cuma',
    'Cumartesi',
    'Pazar',
];

export const getSchedules = async (req, res) => {
    try {
        const { role, userId, studentId } = req.query;
        let whereClause = {};

        // If a specific student ID is requested, fetch their schedules
        if (studentId) {
            whereClause.studentId = studentId;
        }
        // Fallback for general fetch based on role and userId
        else if (userId) {
            if (role === 'teacher') {
                whereClause.teacherId = userId;
            } else {
                whereClause.studentId = userId;
            }
        }

        const schedules = await StudySchedule.findAll({ where: whereClause });
        return res.status(200).json({ schedules });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: Programlar getirilemedi.' });
    }
};

export const createSchedule = async (req, res) => {
    try {
        const {
            teacherId,
            studentId,
            studentName,
            day,
            timeRange,
            subject,
            topic,
            tematic,
            explanation,
            workType,
            generalRep,
            bookSources,
            videoSources,
        } = req.body.schedules;

        const isAllDays = req.body.isAllDays;

        if (
            !teacherId ||
            !studentId ||
            !day ||
            !timeRange ||
            !subject ||
            !topic ||
            !workType
        ) {
            return res.status(400).json({
                message:
                    'Eksik alanlar var. Lütfen tüm zorunlu alanları doldurun.',
            });
        }

        if (!isAllDays) {
            await StudySchedule.create({
                teacherId,
                studentId,
                studentName,
                day,
                deadline: getNearestDateForDay(day),
                timeRange,
                subject,
                topic,
                tematic,
                explanation,
                workType,
                generalRep,
                bookSources,
                videoSources,
            });
        } else {
            for (const day of weekDays) {
                await StudySchedule.create({
                    teacherId,
                    studentId,
                    studentName,
                    day,
                    deadline: getNearestDateForDay(day),
                    timeRange,
                    subject,
                    topic,
                    tematic,
                    explanation,
                    workType,
                    generalRep,
                    bookSources,
                    videoSources,
                });
            }
        }

        return res
            .status(201)
            .json({ message: 'Programlar başarıyla oluşturuldu.' });
    } catch (error) {
        console.error('Error creating schedule:', error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: Program oluşturulamadı.' });
    }
};

export const createBulkSchedule = async (req, res) => {
    try {
        const schedules = req.body.schedules;

        const newSchedules = schedules.map(schedule => ({
            ...schedule,
            id: undefined, // Ensure the id is not set, so Sequelize can auto-generate it
            deadline: getNearestDateForDay(schedule.day),
        }));

        if (!Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({
                message:
                    'Geçersiz program verisi. Lütfen geçerli bir program listesi sağlayın.',
            });
        }

        await StudySchedule.bulkCreate(newSchedules);
        return res
            .status(201)
            .json({ message: 'Programlar başarıyla oluşturuldu.' });
    } catch (error) {
        console.error('Error creating schedule:', error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: Program oluşturulamadı.' });
    }
};

export const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            day,
            timeRange,
            subject,
            topic,
            tematic,
            explanation,
            workType,
            generalRep,
            bookSources,
            videoSources,
            studentId,
        } = req.body;

        const schedule = await StudySchedule.findByPk(id);

        if (!schedule) {
            return res.status(404).json({ message: 'Program bulunamadı.' });
        }

        /* const student = await Users.findByPk(studentId);

        if (!student) {
            return res.status(404).json({ message: 'Öğrenci bulunamadı.' });
        }

        if (videoSources && student.videos?.[subject]) {
            const updatedVideos = student.videos[subject].map(video => {
                videoSources.forEach(source => {
                    if (video.url === source.url) {
                        Object.assign(video, source);
                    }
                });
                return video;
            });

            student.videos[subject] = updatedVideos;

            await Users.update(
                { videos: student.videos },
                { where: { id: studentId } }
            );
        } */

        await schedule.update({
            day,
            timeRange,
            subject,
            topic,
            tematic,
            explanation,
            workType,
            generalRep,
            bookSources,
            videoSources,
        });

        return res.status(200).json(schedule);
    } catch (error) {
        console.error('Error updating schedule:', error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: Program güncellenemedi.' });
    }
};

export const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await StudySchedule.findByPk(id);

        if (!schedule) {
            return res.status(404).json({ message: 'Program bulunamadı.' });
        }

        await schedule.destroy();
        return res.status(200).json({ message: 'Program başarıyla silindi.' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: Program silinemedi.' });
    }
};

export const deleteAllSchedule = async (req, res) => {
    try {
        const { studentId } = req.params;

        await StudySchedule.destroy({ where: { studentId } });
        return res
            .status(200)
            .json({ message: 'Programlar başarıyla silindi.' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: Program silinemedi.' });
    }
};

export const updateScheduleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { checked } = req.body;

        console.trace(checked);

        const schedule = await StudySchedule.findByPk(id);

        if (!schedule) {
            return res.status(404).json({ message: 'Program bulunamadı.' });
        }

        // Update only the checked status
        await schedule.update({ checked });

        return res.status(200).json(schedule);
    } catch (error) {
        console.error('Error updating schedule status:', error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: Program durumu güncellenemedi.' });
    }
};

export const createSchedulePDF = async (req, res) => {
    try {
        const { studentId, studentName } = req.params;

        let schedules = await StudySchedule.findAll({ where: { studentId } });

        if (!schedules || schedules.length === 0) {
            return res.status(404).json({
                message: 'Öğrenciye ait veya işaretlenmiş program bulunamadı.',
            });
        }

        const docDefObj = generateScheduleDocDefinition(studentName, schedules);

        return res.status(200).json({ docDefinition: docDefObj });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: PDF objesi oluşturulamadı.' });
    }
};
