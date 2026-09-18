import PDFDocument from 'pdfkit';
import axios from 'axios'; // Ensure axios is installed: npm install axios
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

import models from '../models/index.model.js';
import Users from '../models/user.model.js';

const { Solution, UnsolvedQuestion } = models;

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

const KEY = process.env.BUNNY_KEY;

const BUNNY_ZONE = 'teachflow';

const baseHost = 'storage.bunnycdn.com';

export const getUQURL = async (req, res) => {
    const queries = req.query;

    try {
        let questions;

        if (queries.role === 'student') {
            questions = await UnsolvedQuestion.findAll({
                where: {
                    studentId: queries.id,
                    teacherId: queries.teacherId,
                },
            });
        }

        if (queries.role === 'teacher') {
            questions = await UnsolvedQuestion.findAll({
                where: {
                    studentId: queries.studentId,
                    teacherId: queries.id,
                },
            });
        }

        if (queries.role === 'parent') {
            questions = await UnsolvedQuestion.findAll({
                where: {
                    studentId: queries.studentId,
                },
            });
        }

        res.json({
            success: true,
            questions,
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

export const uploadUQ = async (req, res) => {
    const {
        homeworkId,
        studentId,
        teacherId,
        subject,
        topic,
        studentName,
        pages,
    } = req.body;

    // Çoklu dosya kontrolü (req.files array olarak gelir)
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Herhangi bir dosya yüklenmedi.',
        });
    }

    try {
        const teacher = await Users.findOne({ where: { id: teacherId } });
        const teacherName = (teacher.name + ' ' + teacher.surname).trim();

        // Promise.all kullanarak tüm dosyaları BunnyCDN'e paralel olarak yüklüyoruz.
        // Bu sayede 3 fotoğraf yüklemek 1 fotoğraf yüklemekle neredeyse aynı sürede biter.
        const uploadPromises = req.files.map(async (file, index) => {
            // İsim çakışmasını önlemek için index'i de ekliyoruz
            const uniqueName = `${teacherName}/${studentName}/unsolved-questions/${subject}/${topic}/${Date.now()}.webp`; // Frontend'de webp yapıldığını varsayıyoruz

            const uploadUrl = `https://${baseHost}/${BUNNY_ZONE}/${uniqueName}`;
            const pullZoneURL = `https://cdn.teachflow.net/${uniqueName}`;

            // 1. BunnyCDN'e Yükle
            await axios.put(uploadUrl, file.buffer, {
                headers: {
                    AccessKey: KEY,
                    'Content-Type': file.mimetype,
                },
            });

            // 2. Veritabanına Kaydet
            const unsolvedQuestion = await UnsolvedQuestion.create({
                imageUrl: pullZoneURL,
                homeworkId,
                studentId,
                teacherId,
                subject,
                topic,
                pages,
            });

            // 3. Her bir dosya için path ve id döndür
            return {
                filePath: uniqueName,
                qId: unsolvedQuestion.id,
                studentId,
                teacherId,
            };
        });

        // Tüm paralel işlemlerin bitmesini bekle
        const uploadedData = await Promise.all(uploadPromises);
        // Frontend'e yüklenen tüm dosyaların bilgilerini dizi (array) olarak dön
        res.json({
            success: true,
            message: `${uploadedData.length} fotoğraf başarıyla yüklendi.`,
            data: uploadedData, // [{filePath, qId}, {filePath, qId}, ...]
        });
    } catch (error) {
        console.error('Çoklu yükleme hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu veya BunnyCDN bağlantısı başarısız.',
        });
    }
};

export const deleteUQURL = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. DB'den soruyu ID ile bul
        const question = await UnsolvedQuestion.findByPk(id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Silinecek soru bulunamadı.',
            });
        }

        // 2. DB'deki imageUrl'den Bunny path'i çıkar
        const imageUrl = question.imageUrl;
        const filePath = new URL(imageUrl).pathname.substring(1);

        const deleteUrl = `https://${baseHost}/${BUNNY_ZONE}/${filePath}`;

        // 3. Bunny'den sil
        const bunnyResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                AccessKey: KEY,
            },
        });

        if (!bunnyResponse.ok) {
            const bunnyError = await bunnyResponse.text();

            console.error('Bunny Storage silme hatası:', {
                status: bunnyResponse.status,
                statusText: bunnyResponse.statusText,
                response: bunnyError,
                deleteUrl,
            });

            throw new Error(
                `Bunny Storage ${bunnyResponse.status}: ${bunnyError}`
            );
        }

        // 4. Solution'ı sil
        await Solution.destroy({
            where: {
                qId: question.id,
            },
        });

        // 5. Soru DB kaydını sil
        await UnsolvedQuestion.destroy({
            where: {
                id: question.id,
            },
        });

        return res.json({
            success: true,
            message: 'Soru ve bağlı çözümü silindi.',
        });
    } catch (error) {
        console.error('deleteUQURL error:', error);

        return res.status(500).json({
            success: false,
            message: 'Soru silinirken sunucu hatası oluştu.',
            error:
                process.env.NODE_ENV === 'development'
                    ? error.message
                    : undefined,
        });
    }
};

export const deleteBatchUQURL = async (req, res) => {
    const { studentId, questionIds } = req.body;

    // 1. Girdi kontrolü
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Geçerli soru ID listesi gönderilmedi.',
        });
    }

    try {
        // 2. DB'den soruları bul (studentId varsa güvenliği sağlamak için filtreye ekleyin)
        const whereClause = { id: questionIds };
        if (studentId) whereClause.studentId = studentId;

        const questions = await UnsolvedQuestion.findAll({
            where: whereClause,
        });

        if (!questions.length) {
            return res.status(404).json({
                success: false,
                message: 'Silinecek sorular bulunamadı.',
            });
        }

        const foundQuestionIds = questions.map(q => q.id);

        // 3. Bunny Storage'dan paralel silme işlemi
        await Promise.allSettled(
            questions.map(async question => {
                try {
                    const filePath = new URL(
                        question.imageUrl
                    ).pathname.substring(1);
                    const deleteUrl = `https://${baseHost}/${BUNNY_ZONE}/${filePath}`;

                    const bunnyResponse = await fetch(deleteUrl, {
                        method: 'DELETE',
                        headers: { AccessKey: KEY },
                    });

                    // 404 (zaten yok) dışındaki hataları logla
                    if (!bunnyResponse.ok && bunnyResponse.status !== 404) {
                        const bunnyError = await bunnyResponse.text();
                        console.warn(
                            `Bunny silme uyarısı (${bunnyResponse.status}):`,
                            bunnyError
                        );
                    }
                } catch (err) {
                    console.error('Bunny URL parse/silme hatası:', err.message);
                }
            })
        );

        // 4. Veritabanından bağlı çözümleri ve soruları sil
        await Solution.destroy({
            where: { qId: foundQuestionIds },
        });

        await UnsolvedQuestion.destroy({
            where: { id: foundQuestionIds },
        });

        return res.json({
            success: true,
            message: 'Seçilen sorular ve bağlı çözümleri başarıyla silindi.',
        });
    } catch (error) {
        console.error('deleteBatchUQURL error:', error);

        return res.status(500).json({
            success: false,
            message: 'Sorular silinirken sunucu hatası oluştu.',
            error:
                process.env.NODE_ENV === 'development'
                    ? error.message
                    : undefined,
        });
    }
};

export const deleteAllUQURL = async (req, res) => {
    const { studentId } = req.params;

    try {
        const questions = await UnsolvedQuestion.findAll({
            where: { studentId },
            attributes: ['id'],
        });

        const deletePromise = Promise.allSettled(
            questions.map(async question => {
                try {
                    const fullUrl = question.imageUrl;

                    const pathOnly = decodeURIComponent(
                        new URL(fullUrl).pathname
                    );

                    const bunnyDeleteUrl = `https://${baseHost}/${BUNNY_ZONE}${pathOnly}`;

                    console.trace('Bunny silme URL:', bunnyDeleteUrl);

                    const bunnyResponse = await fetch(bunnyDeleteUrl, {
                        method: 'DELETE',
                        headers: {
                            AccessKey: KEY,
                        },
                    });

                    if (!bunnyResponse.ok && bunnyResponse.status !== 404) {
                        const bunnyError = await bunnyResponse.text();
                        console.warn(
                            `Bunny silme işlemi başarısız: ${bunnyResponse.status} ${bunnyError}`
                        );
                    }
                } catch (error) {
                    console.error(
                        'Bunny silme işlemi sırasında hata oluştu:',
                        error
                    );
                }
            })
        );

        await deletePromise;

        // 3. Solution kayıtlarını sil
        if (questions.length > 0) {
            const questionIds = questions.map(q => q.id);

            await Solution.destroy({
                where: {
                    qId: questionIds,
                },
            });
        }

        // 4. Başarılı
        return res.json({
            success: true,
            message: `${studentName} adlı öğrencinin tüm çözülemeyen soruları silindi.`,
        });
    } catch (error) {
        console.error('deleteAllUQURL error:', error);

        return res.status(500).json({
            success: false,
            message: 'Çözülemeyen sorular silinirken sunucu hatası oluştu.',
            error:
                process.env.NODE_ENV === 'development'
                    ? error.message
                    : undefined,
        });
    }
};

export const updateUQAppearance = async (req, res) => {
    const { bool, id } = req.query;

    try {
        await UnsolvedQuestion.update({ show: bool }, { where: { id } });

        res.json({
            success: true,
            questionId: id,
            message: 'Görünüm güncellendi.',
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

export const createTestPDF = async (req, res) => {
    // İstekten test başlığını da alabiliriz (gelmezse varsayılan atarız)
    const {
        studentId,
        teacherId,
        criteria,
        testTitle = 'Konu Tarama Testi',
    } = req.body;

    console.trace('createTestPDF criteria:', criteria);

    if (
        !studentId ||
        !teacherId ||
        !Array.isArray(criteria) ||
        criteria.length === 0
    ) {
        return res
            .status(400)
            .json({ success: false, message: 'Eksik bilgi gönderildi.' });
    }

    try {
        const selectedQuestions = [];

        // 1. Soruları Çek ve Karıştır
        for (const item of criteria) {
            const {
                pickSubject: subject,
                pickTopic: topic,
                pickQNum: count,
            } = item;

            const questions = await UnsolvedQuestion.findAll({
                where: { studentId, teacherId, subject, topic, show: true },
            });

            if (questions.length > 0) {
                const shuffled = questions.sort(() => 0.5 - Math.random());
                const picked = shuffled.slice(0, count);
                selectedQuestions.push(...picked);
            }
        }

        const promises = selectedQuestions.map(async question => {
            try {
                await question.update({ show: false });
            } catch (error) {
                console.error(error.message);
            }
        });

        await Promise.all(promises);

        if (selectedQuestions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kriterlere uygun soru bulunamadı.',
            });
        }

        // 3. PDF Dokümanını Başlat
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
        });

        doc.registerFont('TurkishFont', fontPath);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=test-${Date.now()}.pdf`
        );

        doc.pipe(res);

        // --- SAYFA VE SÜTUN AYARLARI ---
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 40;
        const columnGap = 30; // İki sütun arasındaki boşluk
        // Her bir sütunun genişliği: (Toplam Genişlik - Sol Marjin - Sağ Marjin - Orta Boşluk) / 2
        const columnWidth = (pageWidth - margin * 2 - columnGap) / 2;
        const gap = 20; // Sorular arası dikey boşluk

        // --- BAŞLIK VE BİLGİ ALANI FONKSİYONU ---
        const drawHeader = () => {
            const dateStr = new Intl.DateTimeFormat('tr-TR').format(new Date());
            const logoSize = 80; // Logonun boyutu

            // 1. Logoyu Ekle (Sol Üst Köşe)
            try {
                doc.image(logoPath, margin, margin - 35, { width: logoSize });
            } catch (err) {
                console.error('Logo yüklenemedi:', err.message);
            }

            // 2. Ana Başlık (Logonun yanından başlayacak şekilde veya ortalı)
            doc.fontSize(16)
                .font('Helvetica-Bold')
                .text(testTitle, margin, margin, { align: 'center' });

            // 3. Alt Bilgi Satırı
            const infoY = margin + 25;
            doc.fontSize(10).font('Helvetica');

            // SAĞDA: Tarih
            doc.text(`Tarih: ${dateStr}`, margin, infoY, {
                align: 'right',
                width: pageWidth - margin * 2,
            });

            // 4. Ayraç Çizgisi
            doc.moveTo(margin, infoY + 15)
                .lineTo(pageWidth - margin, infoY + 15)
                .lineWidth(1)
                .stroke();

            return infoY + 30;
        };

        // --- ORTA ÇİZGİ FONKSİYONU ---
        const drawCenterLine = startY => {
            doc.moveTo(pageWidth / 2, startY)
                .lineTo(pageWidth / 2, pageHeight - margin)
                .lineWidth(0.5)
                .dash(5, { space: 5 }) // Kesik çizgiler (Örnekteki gibi)
                .stroke();
            doc.undash(); // Diğer çizimlerin kesik olmasını engellemek için
        };

        // Değişkenleri tanımla
        let startY = drawHeader();
        let currentY = startY;
        let currentColumn = 0; // 0: Sol sütun, 1: Sağ sütun

        drawCenterLine(startY);

        // Yeni sayfa ekleme fonksiyonu
        const addNewPageAndReset = () => {
            doc.addPage({ margin: 40 });
            startY = margin; // Yeni sayfada başlık yok, en üstten başla
            currentY = startY;
            currentColumn = 0;
            drawCenterLine(startY);
        };

        function capitalizeFirstLetter(string) {
            if (!string) return string;

            return string
                .split(' ')
                .map(word => {
                    if (word.length === 0) return word;
                    // Türkçe yerel ayarını kullanarak büyütme yapıyoruz
                    return (
                        word.charAt(0).toLocaleUpperCase('tr-TR') +
                        word.slice(1).toLowerCase()
                    );
                })
                .join(' ');
        }

        // 4. İmajları İşle ve Sayfaya Yerleştir
        for (let i = 0; i < selectedQuestions.length; i++) {
            const question = selectedQuestions[i];

            try {
                const imageResponse = await axios.get(question.imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 5000,
                });
                const originalBuffer = Buffer.from(
                    imageResponse.data,
                    'binary'
                );

                const image = sharp(originalBuffer);
                const metadata = await image.metadata();
                const pngBuffer = await image.png().toBuffer();

                const scaleFactor = metadata.width / metadata.height;
                let renderWidth = columnWidth;
                let renderHeight = renderWidth / scaleFactor;

                // Metin için ek boşluk (Soru numarası yüksekliği)
                const textHeight = 20;

                // --- SAYFA / SÜTUN KONTROLÜ ---
                // Soru metni + Görsel + Boşluk toplam yüksekliği kontrol ediyoruz
                if (
                    currentY + textHeight + renderHeight >
                    pageHeight - margin
                ) {
                    if (currentColumn === 0) {
                        currentColumn = 1;
                        currentY = startY;
                    } else {
                        addNewPageAndReset();
                    }
                }

                const currentX =
                    currentColumn === 0
                        ? margin
                        : margin + columnWidth + columnGap;

                // --- SORU NUMARASI YAZDIRMA ---
                doc.fontSize(8)
                    .font('TurkishFont')
                    .fillColor('red')
                    .text(
                        `Soru ${i + 1}.   Ders: ${capitalizeFirstLetter(question.subject)}   Konu: ${capitalizeFirstLetter(question.topic)}`,
                        currentX,
                        currentY
                    );

                // Metinden sonra görsel için Y koordinatını kaydır
                const imageY = currentY + 15;

                // Görseli bas
                doc.image(pngBuffer, currentX, imageY, {
                    width: renderWidth,
                });

                // Bir sonraki soru için koordinatı güncelle (Metin + Görsel + Gap)
                currentY = imageY + renderHeight + gap;
            } catch (imgError) {
                // Hata durumunda da numarayı basıp hata mesajı gösterelim ki sıra bozulmasın
                const currentX =
                    currentColumn === 0
                        ? margin
                        : margin + columnWidth + columnGap;
                doc.fontSize(11)
                    .font('Helvetica-Bold')
                    .text(`Soru ${i + 1}.`, currentX, currentY);
                doc.fontSize(10)
                    .font('Helvetica')
                    .fillColor('red')
                    .text(` Görsel yüklenemedi.`, currentX + 40, currentY);
                doc.fillColor('black');
                currentY += 30 + gap;
            }
        }

        // PDF'i bitir
        doc.end();
    } catch (error) {
        console.trace('Kritik PDF Hatası:', error.message);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'PDF oluşturulurken hata oluştu.',
            });
        }
    }
};
