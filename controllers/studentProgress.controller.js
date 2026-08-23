import models from '../models/index.model.js';

const { Users, Cirriculum, StudentBookProgress } = models;

export const getStudentBookProgress = async (req, res) => {
    try {
        const { studentId, subject } = req.params;

        const student = await Users.findByPk(studentId);
        if (!student && !student.books) {
            return res.status(404).json({
                success: false,
                message: 'Öğrenci veya kitap bilgisi bulunamadı',
            });
        }

        const grade =
            student.grade === 'KPSS' || student.grade === 'DGS'
                ? '12'
                : student.grade;

        let edLevel = 'lise';
        if (grade && parseInt(grade) < 9) {
            edLevel = 'ortaokul';
        }

        // 2. Sadece öğrencinin derslerine ait konuları çek
        const topics = await Cirriculum.findAll({
            where: {
                educationLevel: edLevel,
                subject: subject, // SQL 'IN' operatörü kullanır, çok daha hızlıdır
            },
            include: [
                {
                    model: StudentBookProgress,
                    as: 'bookProgresses',
                    where: { studentId },
                    required: false,
                },
            ],
            order: [
                ['subject', 'ASC'],
                ['id', 'ASC'],
            ],
        });

        console.trace(topics.slice(0, 10));

        const studentBooksForSubject = student.books[subject];

        if (!studentBooksForSubject)
            return res.status(404).json({
                success: false,
                message: `${subject} dersi ile ilgili ekli kaynak yok.`,
            });

        const bookNames = [];

        let newBooksArray;

        if (
            !bookNames.includes('Konu Anlatımı') &&
            !bookNames.includes('Çıkmış Sorular')
        ) {
            newBooksArray = [
                { url: null, isChecked: false, sourceName: 'Konu Anlatımı' },
                ...studentBooksForSubject,
                { url: null, isChecked: false, sourceName: 'Çıkmış Sorular' },
            ];
        } else {
            newBooksArray = studentBooksForSubject;
        }

        // 3. Tek bir döngü ile veriyi işle
        const result = topics.reduce((acc, topic) => {
            // Bu konuya ait progress'leri hızlı erişim için bir Map'e çevir (O(1) lookup)
            const progressMap = new Map(
                topic.bookProgresses?.map(p => [p.bookName, p.isCompleted])
            );

            // Kitap durumlarını oluştur
            const books = newBooksArray.map(bp => ({
                bookName: bp.sourceName,
                subject: topic.subject,
                isCompleted: progressMap.get(bp.sourceName) || false,
            }));

            // Sonuca ekle
            acc.push({
                topicId: topic.id,
                subject: topic.subject,
                tema: topic.tema,
                topic: topic.topic,
                gradeLevel: topic.gradeLevel,
                cirriculumVersion: topic.curriculumVersion,
                books: books,
            });

            return acc;
        }, []);

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('İlerleme Getirme Hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Veriler getirilirken hata oluştu.',
        });
    }
};

export const getBPForSchedule = async (req, res) => {
    const { studentId, subject } = req.params;

    try {
        const progresses = await StudentBookProgress.findAll({
            where: { studentId, subject },
            include: [
                {
                    model: Cirriculum,
                    as: 'topic',
                    attributes: [
                        'id',
                        'topic',
                        'tema',
                        'subject',
                        'gradeLevel',
                    ],
                },
            ],
        });
        return res.status(200).json({ success: true, data: progresses });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Veriler getirilirken hata oluştu.',
        });
    }
};

export const toggleBookProgress = async (req, res) => {
    try {
        const { studentId, topicId, subject, bookName, isCompleted } = req.body;

        if (!bookName) {
            return res
                .status(400)
                .json({ success: false, message: 'Kitap adı zorunludur.' });
        }

        let progress = await StudentBookProgress.findOne({
            where: {
                studentId,

                topicId,

                bookName,
            },
        });

        if (progress) {
            progress.isCompleted = isCompleted;
            await progress.save();
        } else {
            progress = await StudentBookProgress.create({
                studentId,
                topicId,
                bookName,
                subject,
                isCompleted,
            });
        }

        res.status(200).json({ success: true, data: progress });
    } catch (error) {
        console.error('Tik atma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İlerleme kaydedilirken hata oluştu.',
        });
    }
};
