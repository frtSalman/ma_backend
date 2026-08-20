import axios from 'axios';
import crypto from 'crypto';
import models from '../models/index.model.js';
import { processExamData } from '../pipeline/mainProcessor.js';

const { Exam, Users, Subscription } = models;

const n8nWebhookUrl =
    process.env.NODE_ENV === 'production'
        ? 'https://n8n.teachflow.net/webhook/84259f1b-da3d-4a5e-9a97-11d852f1f4ad'
        : 'https://n8n.teachflow.net/webhook-test/84259f1b-da3d-4a5e-9a97-11d852f1f4ad';

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

function setDate(date) {
    const [d, m, y] = date.split('.');
    return new Date(m + '.' + d + '.' + y).toLocaleDateString();
}

export const getExamResults = async (req, res) => {
    const { role, userId, studentId } = req.query;

    try {
        let exams;

        if (role === 'teacher' && studentId !== undefined) {
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
        if (role === 'parent' && studentId !== undefined) {
            exams = await Exam.findAll({
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
            exams = await Exam.findAll({
                where: { studentId: userId },
                include: [
                    {
                        model: Users,
                        as: 'student',
                        attributes: ['name'], // Select specific fields
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

export const uploadExam = async (req, res) => {
    const { studentId } = req.body;

    const teacherId = req.userId;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Herhangi bir dosya yüklenmedi.',
        });
    }

    try {
        const teacher = await Users.findOne({
            where: { id: teacherId },
        });

        const subscription = await Subscription.findOne({
            where: { userId: teacherId },
            order: [['createdAt', 'DESC']],
        });

        if (
            teacher.accountType === 'normal' &&
            subscription.aiAnalysedExamNum >=
                subscription.aiAnalysedExamNumQuota
        )
            return;

        const student = await Users.findOne({
            where: { id: studentId },
        });

        if (teacher.role !== 'teacher') return;

        const teacherName = (teacher.name + ' ' + teacher.surname).trim();

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Öğrenci bulunamadı.',
            });
        }

        const examPromises = req.files.map(async file => {
            const originalName = file.originalname || file.name;

            const uniqueId = crypto.randomUUID();

            const fileName =
                `${teacherName}/${student.name}/examResults/` +
                `${uniqueId}-Exam_result-${originalName}`;

            //const safeFilename = fileName.replace(/\s+/g, '-');

            const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/${fileName}`;

            const pullZoneURL = `https://cdn.teachflow.net/${fileName}`;

            // BunnyCDN
            await axios.put(uploadUrl, file.buffer, {
                headers: {
                    AccessKey: KEY,
                    'Content-Type': file.mimetype,
                },
            });

            // n8n
            const aiJsonPayload = await axios.post(n8nWebhookUrl, {
                path: pullZoneURL,
            });

            // Exam processing
            const results = await processExamData(
                aiJsonPayload.data,
                student.grade
            );

            const analysis = Object.groupBy(results, item => item.subject);

            const scoreSummary = Object.entries(analysis).reduce(
                (acc, [subject, topics]) => {
                    if (!acc[subject]) {
                        acc[subject] = {
                            D: 0,
                            Y: 0,
                            SS: 0,
                            NET: 0,
                        };
                    }

                    topics.forEach(topic => {
                        acc[subject].D += +topic.D || 0;
                        acc[subject].Y += +topic.Y || 0;
                        acc[subject].SS += +topic.T || 0;
                    });

                    acc[subject].NET = acc[subject].D - acc[subject].Y * 0.25;

                    acc[subject].subject = subject;

                    if (!acc['totals']) {
                        acc['totals'] = {
                            D: 0,
                            Y: 0,
                            SS: 0,
                            NET: 0,
                        };
                    }

                    acc['totals']['NET'] += acc[subject].NET;
                    acc['totals']['D'] += acc[subject].D;
                    acc['totals']['Y'] += acc[subject].Y;
                    acc['totals']['SS'] += acc[subject].SS;

                    return acc;
                },
                {}
            );

            const settledDate = setDate(aiJsonPayload?.data?.header?.examDate);

            // DB
            return Exam.create({
                studentId,
                teacherId: req.userId,
                path: pullZoneURL,
                analysis: results,
                scoreSummary,
                totalPoint: aiJsonPayload?.data?.header?.totalPoint,
                examTitle: aiJsonPayload?.data?.header?.examName,
                examDate: settledDate,
            });
        });

        const results = await Promise.allSettled(examPromises);

        await teacher.increment({ aiAnalysedExamNum: results.length });

        if (subscription)
            await subscription.increment({ aiAnalysedExamNum: results.length });

        const successful = results.filter(
            result => result.status === 'fulfilled'
        );

        const failed = results.filter(result => result.status === 'rejected');

        return res.json({
            success: failed.length === 0,
            message:
                failed.length === 0
                    ? 'Deneme sonuçları oluşturuldu. ✅'
                    : `${successful.length} dosya işlendi, ${failed.length} dosya başarısız oldu.`,
            processedCount: successful.length,
            failedCount: failed.length,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

/* export const uploadExam = async (req, res) => {
    const { studentId } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Herhangi bir dosya yüklenmedi.',
        });
    }

    try {
        // 1. Bu await KALMAK ZORUNDA. Çünkü öğrencinin bilgilerine ihtiyacımız var.
        const student = await Users.findOne({
            where: { id: studentId },
        });

        if (!student) {
            return res
                .status(404)
                .json({ success: false, message: 'Öğrenci bulunamadı.' });
        }

        // 2. ARKA PLAN İŞLEMİNİ TANIMLIYORUZ (İçerideki awaitler sırayı korur)
        const processFilesInBackground = async () => {
            for (const file of req.files) {
                try {
                    const originalName = file.originalname || file.name;
                    const fileName = `${student.name}/examResults/${Date.now()}-Exam_result-${originalName}`;
                    const safeFilename = fileName.replace(/\s+/g, '-');
                    const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/${safeFilename}`;
                    const pullZoneURL = `https://cdn.teachflow.net/${safeFilename}`;

                    // BunnyCDN'e yüklenmesini beklemeliyiz ki n8n dosyayı bulabilsin
                    await axios.put(uploadUrl, file.buffer, {
                        headers: {
                            AccessKey: KEY,
                            'Content-Type': file.mimetype,
                        },
                    });

                    // n8n'den yanıt gelmesini bekliyoruz
                    const aiJsonPayload = await axios.post(n8nWebhookUrl, {
                        path: pullZoneURL,
                    });

                    const results = await processExamData(
                        aiJsonPayload.data,
                        student?.grade
                    );

                    const analysis = Object.groupBy(
                        results,
                        item => item.subject
                    );

                    const scoreSummary = Object.entries(analysis).reduce(
                        (acc, [subject, topics]) => {
                            if (!acc[subject]) {
                                acc[subject] = { D: 0, Y: 0, SS: 0, NET: 0 };
                            }

                            topics.forEach(topic => {
                                acc[subject]['D'] += +topic.D || 0;
                                acc[subject]['Y'] += +topic.Y || 0;
                                acc[subject]['SS'] += +topic.T || 0;
                            });

                            acc[subject]['NET'] =
                                acc[subject]['D'] - acc[subject]['Y'] * 0.25;
                            acc[subject]['subject'] = subject;

                            return acc;
                        },
                        {}
                    );

                    const settledDate = setDate(
                        aiJsonPayload?.data?.header?.examDate
                    );

                    // DB'ye kaydet
                    await Exam.create({
                        studentId: studentId,
                        teacherId: student?.teacherId,
                        path: pullZoneURL,
                        analysis: results,
                        scoreSummary,
                        totalPoint: aiJsonPayload?.data.header?.totalPoint,
                        examTitle: aiJsonPayload?.data.header?.examName,
                        examDate: settledDate,
                    });
                } catch (bgError) {
                    // Arka planda patlayan dosyalar sunucuyu çökertmesin diye buraya catch ekliyoruz
                    console.error(
                        'Arka plan işlenirken hata oluştu:',
                        bgError.message
                    );
                }
            }
        };

        // 3. FONKSİYONU ÇAĞIRIYORUZ AMA BAŞINA AWAIT KOYMUYORUZ! (Sihir burada)
        // Express bu işlemin bitmesini beklemeden hemen alt satıra geçecek.
        processFilesInBackground();

        // 4. KULLANICIYA ANINDA CEVAP DÖNÜYORUZ
        return res.json({
            success: true,
            message:
                'Dosyalar yüklendi ve analize gönderildi. İşlem arka planda devam ediyor. ✅',
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            success: false,
            message: !studentId
                ? 'Lütfen bir öğrenci seçiniz.'
                : 'Sunucu hatası oluştu.',
        });
    }
}; */

export const examOCRTest = async (req, res) => {
    const { path, grade } = req.body;

    try {
        // 4. n8n Webhook'u tetikle
        const aiJsonPayload = await axios.post(n8nWebhookUrl, {
            path: path,
        });

        const result = await processExamData(aiJsonPayload.data, grade);

        const scoreSummary = Object.entries(aiJsonPayload.data.analysis).reduce(
            (acc, [subject, topics]) => {
                if (!acc[subject]) {
                    acc[subject] = { D: 0, Y: 0, SS: 0, NET: 0 };
                }

                topics.forEach(topic => {
                    acc[subject]['D'] += +topic.D || 0;
                    acc[subject]['Y'] += +topic.Y || 0;
                    acc[subject]['SS'] += +topic.T || 0;
                });

                acc[subject]['NET'] =
                    acc[subject]['D'] - acc[subject]['Y'] * 0.25;
                acc[subject]['subject'] = subject;

                return acc;
            },
            {}
        );

        return res.json({
            success: true,
            message: 'Deneme sonuçları test edildi.',
            result,
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: !path
                ? 'Lütfen bir dosya seçiniz.'
                : 'Sunucu hatası oluştu.',
        });
    }
};

export const deleteExamURL = async (req, res) => {
    const { path, id, studentName } = req.body;

    try {
        const teacher = await Users.findOne({
            where: { id: req.userId },
        });

        if (teacher.role !== 'teacher') return;

        const teacherName = (teacher.name + ' ' + teacher.surname).trim();

        //const safeStudentName = studentName.replace(/\s+/g, '-');

        console.trace(path); //b7858981-9bd4-4722-be31-b6672a1cc834-Exam_result-exam-1.pdf

        const deleteUrl = `https://${baseHost}/${BUNNY_ZONE}/${teacherName}/${studentName}/examResults/${path}`;

        await Exam.destroy({
            where: { id },
        });

        await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                AccessKey: KEY,
            },
        });

        return res.json({
            success: true,
            message: 'Deneme sonucu silindi.',
        });
    } catch (error) {
        console.trace(error.message);
        return res.status(500).json({
            // 500 Internal Server Error
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};

export const updateExam = async (req, res) => {
    const id = req.params.id;
    const { analysis, scoreSummary, examTitle, examDate, totalPoint } =
        req.body.data;

    try {
        const teacher = await Users.findOne({
            where: { id: req.userId },
        });

        if (teacher.role !== 'teacher') return;

        await Exam.update(
            {
                analysis,
                scoreSummary,
                examTitle,
                examDate,
                totalPoint,
            },
            { where: { id: id } }
        );

        return res.status(200).json({
            success: true,
            message: 'Deneme sonucu güncellenmiştir.',
        });
    } catch (error) {
        console.trace(error);
        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
};
