import StudySchedule from '../models/studySchedule.model.js';

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
        } = req.body;

        const schedule = await StudySchedule.findByPk(id);

        console.trace('Received update data:', req.body);

        if (!schedule) {
            return res.status(404).json({ message: 'Program bulunamadı.' });
        }

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
