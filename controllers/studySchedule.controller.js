import getNearestDateForDay from '../utils/getNearestDateForDay.js';
import PDFDocument from 'pdfkit-table';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import generateScheduleDocDefinition from '../utils/generateScheduleDocDefinition.js';

import models from '../models/index.model.js';

const { Users, StudentBookProgress, StudySchedule, Cirriculum } = models;

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

export const getAllSchedules = async (req, res) => {
    try {
        const teacherId = req.userId;

        const schedules = await StudySchedule.findAll({ where: { teacherId } });
        return res.status(200).json({ schedules });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: Programlar getirilemedi.' });
    }
};

export const getStudentSchedules = async (req, res) => {
    try {
        const { teacherId, studentId } = req.params;

        const schedules = await StudySchedule.findAll({
            where: { teacherId, studentId },
        });
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

        if (!teacherId || !studentId || !day || !timeRange || !subject) {
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

        console.time('Bulk Schedule Creation Time');
        console.log('Bulk Schedule başladı.');

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

        await StudySchedule.destroy({
            where: { studentId: schedules[0].studentId },
        });
        await StudySchedule.bulkCreate(newSchedules);
        console.timeEnd('Bulk Schedule Creation Time');
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

        const teacherId = req.userId;

        const isAllDays = req.body.isAllDays;

        const schedule = await StudySchedule.findByPk(id);

        if (!schedule) {
            return res.status(404).json({ message: 'Program bulunamadı.' });
        }

        if (!isAllDays) {
            await schedule.update({
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
                    studentId: schedule.studentId,
                    studentName: schedule.studentName,
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
            await schedule.destroy();
        }

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

        const schedule = await StudySchedule.findByPk(id);

        if (!schedule) {
            return res.status(404).json({ message: 'Program bulunamadı.' });
        }

        await schedule.update({ checked });

        let promisses = [];

        const circulumTopic = await Cirriculum.findOne({
            where: {
                subject: schedule.subject,
                topic: schedule.topic,
            },
        });

        const existingProgresses = await StudentBookProgress.findAll({
            where: {
                studentId: schedule.studentId,
                topicId: circulumTopic?.id,
                subject: schedule.subject,
            },
        });

        if (schedule?.workType === 'Konu Anlatımı') {
            const konuAnlatimiProgress = existingProgresses.find(
                p => p.bookName === 'Konu Anlatımı'
            );
            if (konuAnlatimiProgress) {
                await StudentBookProgress.update(
                    { isCompleted: checked },
                    { where: { id: konuAnlatimiProgress.id } }
                );
            } else {
                await StudentBookProgress.create({
                    studentId: schedule.studentId,
                    topicId: circulumTopic?.id,
                    bookName: 'Konu Anlatımı',
                    subject: schedule.subject,
                    isCompleted: checked,
                });
            }
        }

        if (schedule?.workType === 'Çıkmış Sorular') {
            const cikmisSorularProgress = existingProgresses.find(
                p => p.bookName === 'Çıkmış Sorular'
            );
            if (cikmisSorularProgress) {
                await StudentBookProgress.update(
                    { isCompleted: checked },
                    { where: { id: cikmisSorularProgress.id } }
                );
            } else {
                await StudentBookProgress.create({
                    studentId: schedule.studentId,
                    topicId: circulumTopic?.id,
                    bookName: 'Çıkmış Sorular',
                    subject: schedule.subject,
                    isCompleted: checked,
                });
            }
        }

        if (schedule?.workType === 'Soru Çözümü') {
            const promises = schedule.bookSources?.map(book => {
                const existingProgress = existingProgresses.find(
                    p => p.bookName === book.sourceName
                );

                if (existingProgress) {
                    return StudentBookProgress.update(
                        { isCompleted: checked },
                        { where: { id: existingProgress.id } }
                    );
                } else {
                    return StudentBookProgress.create({
                        studentId: schedule.studentId,
                        topicId: circulumTopic?.id,
                        bookName: book?.sourceName,
                        subject: schedule.subject,
                        isCompleted: checked,
                    });
                }
            });

            if (promises) {
                await Promise.all(promises);
            }
        }

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
