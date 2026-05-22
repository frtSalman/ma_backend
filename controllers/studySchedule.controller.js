import StudySchedule from '../models/studySchedule.model.js';
import getNearestDateForDay from '../utils/getNearestDateForDay.js';
import PDFDocument from 'pdfkit-table';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

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
        const { studentId } = req.params;
        const { studentName, scheduleIds } = req.body;

        let whereClause = { studentId };
        if (
            scheduleIds &&
            Array.isArray(scheduleIds) &&
            scheduleIds.length > 0
        ) {
            whereClause.id = scheduleIds;
        }

        let schedules = await StudySchedule.findAll({ where: whereClause });

        if (!scheduleIds && schedules.some(s => s.checked)) {
            schedules = schedules.filter(s => s.checked);
        }

        if (!schedules || schedules.length === 0) {
            return res.status(404).json({
                message: 'Öğrenciye ait veya işaretlenmiş program bulunamadı.',
            });
        }

        const name = studentName || schedules[0].studentName || 'Öğrenci';

        const doc = new PDFDocument({
            margin: 30,
            size: 'A4',
            layout: 'landscape',
        });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${encodeURIComponent(name)}_program.pdf"`
            );
            res.send(pdfData);
        });

        // --- FONT KAYIT İŞLEMLERİ ---
        // Kalın harfler için Roboto-Bold fontunu da sisteme kaydediyoruz.
        // fontPath'inizin yanındaki klasörde kalın versiyonunun olduğunu varsayıyoruz (örn: Roboto-Bold.ttf)
        const fontBoldPath = fontPath.replace('.ttf', '-Bold.ttf');
        doc.registerFont('Roboto', fontPath);
        try {
            doc.registerFont('Roboto-Bold', fontBoldPath);
        } catch (e) {
            // Eğer Bold dosya bulunamazsa hata vermemesi için normal fontu yedek olarak atıyoruz
            doc.registerFont('Roboto-Bold', fontPath);
        }

        doc.font('Roboto');

        // Logo Çizimi
        try {
            doc.image(logoPath, 33, 30, { width: 50 });
        } catch (imgErr) {
            console.error('Logo yüklenemedi:', imgErr);
        }

        // Başlıklar
        doc.font('Roboto-Bold')
            .fontSize(20)
            .text('Haftalık Çalışma Programı', 100, 35, { align: 'center' });
        doc.font('Roboto')
            .fontSize(12)
            .text(`Öğrenci: ${name}`, 100, 60, { align: 'center' });
        doc.moveDown(2);

        // --- ÖZEL HÜCRE ÇİZİCİLERİ (RENKLENDİRME VE KALIN YAZI İÇİN) ---

        // 1. Saat Sütunu için Çizici (Arka planı gri, yazıyı ortalı ve kalın yapar)
        const timeColumnRenderer = (
            value,
            indexColumn,
            indexRow,
            row,
            rectRow,
            rectCell
        ) => {
            const { x, y, width, height } = rectCell;
            doc.save();
            // Açık gri dikey başlık arka planı
            doc.fillColor('#F7FAFC').rect(x, y, width, height).fill();
            doc.lineWidth(0.5)
                .strokeColor('#E2E8F0')
                .rect(x, y, width, height)
                .stroke();
            doc.restore();

            doc.font('Roboto-Bold').fontSize(9).fillColor('#4A5568');
            const textHeight = doc.currentLineHeight(true);
            // Saati dikey ve yatay olarak tam ortalar
            doc.text(value || '-', x, y + height / 2 - textHeight / 2, {
                align: 'center',
                width: width,
            });
            return '';
        };

        // 2. Gün Hücreleri için Çizici (Programları renklendirir, etiketleri kalınlaştırır)
        const dayCellRenderer = (
            value,
            indexColumn,
            indexRow,
            row,
            rectRow,
            rectCell
        ) => {
            const { x, y, width, height } = rectCell;

            doc.save();
            if (value && value !== '-') {
                // Program olan hücreler için tatlı bir açık mavi arka plan
                doc.fillColor('#EBF8FF').rect(x, y, width, height).fill();
                doc.lineWidth(0.5)
                    .strokeColor('#BEE3F8')
                    .rect(x, y, width, height)
                    .stroke();
            } else {
                // Boş hücreler düz beyaz
                doc.fillColor('#FFFFFF').rect(x, y, width, height).fill();
                doc.lineWidth(0.5)
                    .strokeColor('#E2E8F0')
                    .rect(x, y, width, height)
                    .stroke();
            }
            doc.restore();

            if (value && value !== '-') {
                doc.fillColor('#2D3748');
                let currentY = y + 6;
                const lines = value.split('\n');

                lines.forEach(line => {
                    if (line === '---') {
                        // Birden fazla ders varsa aradaki çizgiyi çizer
                        doc.save();
                        doc.moveTo(x + 4, currentY + 3)
                            .lineTo(x + width - 4, currentY + 3)
                            .strokeColor('#CBD5E1')
                            .lineWidth(0.5)
                            .stroke();
                        doc.restore();
                        currentY += 8;
                        return;
                    }

                    // Kalın olması istenen etiketlerin kontrolü
                    const labels = ['Konu:', 'Tür:', 'Not:', 'Kaynak:'];
                    let matchedLabel = labels.find(l => line.startsWith(l));

                    if (matchedLabel) {
                        const restOfText = line
                            .substring(matchedLabel.length)
                            .trim();
                        // Etiket kısmını kalın yazar
                        doc.font('Roboto-Bold').fontSize(8);
                        doc.text(matchedLabel + ' ', x + 5, currentY, {
                            continued: true,
                            width: width - 10,
                        });
                        // Değer kısmını normal yazar
                        doc.font('Roboto').fontSize(8);
                        doc.text(restOfText, { width: width - 10 });

                        // ÇÖZÜM: Katlanan metnin (wrap) kapladığı gerçek yüksekliği hesapla
                        const textHeight = doc.heightOfString(
                            matchedLabel + ' ' + restOfText,
                            { width: width - 10 }
                        );
                        currentY += textHeight + 2; // Gerçek yükseklik + 2px boşluk
                    } else {
                        // Ders adını (örn: Matematik) en başa kalın ve biraz daha büyük yazar
                        doc.font('Roboto-Bold').fontSize(9.5);
                        doc.text(line, x + 5, currentY, { width: width - 10 });

                        // ÇÖZÜM: Katlanan metnin gerçek yüksekliğini hesapla
                        const textHeight = doc.heightOfString(line, {
                            width: width - 10,
                        });
                        currentY += textHeight + 2; // Gerçek yükseklik + 2px boşluk
                    }

                    // ESKİ KODU SİLİN (Aşağıdaki satırı kaldırın):
                    // currentY += doc.currentLineHeight(true) + 1;
                });
            }

            return ''; // pdfkit-table'ın üzerine ham metin yazmasını engellemek için boş dönüyoruz
        };

        // --- VERİ HAZIRLAMA (MATRİS FORMATI) ---
        const daysOfWeek = [
            'Pazartesi',
            'Salı',
            'Çarşamba',
            'Perşembe',
            'Cuma',
            'Cumartesi',
            'Pazar',
        ];
        const timeRanges = [
            ...new Set(schedules.map(s => s.timeRange || '-')),
        ].sort((a, b) => a.localeCompare(b));

        const rows = timeRanges.map(time => {
            const rowData = [time];

            daysOfWeek.forEach(day => {
                const daySchedules = schedules.filter(
                    s => s.day === day && (s.timeRange || '-') === time
                );

                if (daySchedules.length > 0) {
                    const cellTexts = daySchedules.map(s => {
                        let sources = '';
                        try {
                            let books = [];
                            let videos = [];
                            if (s.bookSources) {
                                try {
                                    books =
                                        typeof s.bookSources === 'string'
                                            ? JSON.parse(s.bookSources)
                                            : s.bookSources;
                                } catch (e) {
                                    books = [s.bookSources];
                                }
                            }
                            if (s.videoSources) {
                                try {
                                    videos =
                                        typeof s.videoSources === 'string'
                                            ? JSON.parse(s.videoSources)
                                            : s.videoSources;
                                } catch (e) {
                                    videos = [s.videoSources];
                                }
                            }

                            const booksStr =
                                Array.isArray(books) && books.length > 0
                                    ? books
                                          .map(b => b.sourceName || b)
                                          .join(', ')
                                    : '';
                            const videosStr =
                                Array.isArray(videos) && videos.length > 0
                                    ? videos
                                          .map(v => v.sourceName || v)
                                          .join(', ')
                                    : '';

                            const sourcesArr = [];
                            if (booksStr) sourcesArr.push('Kitap: ' + booksStr);
                            if (videosStr)
                                sourcesArr.push('Video: ' + videosStr);
                            sources = sourcesArr.join(' | ');
                        } catch (e) {
                            sources = '';
                        }

                        let content = `${s.subject || '-'}`;
                        if (s.topic)
                            content += `\nKonu: ${s.topic.length > 40 ? s.topic.substring(0, 40) + '...' : s.topic}`;
                        if (s.workType) content += `\nTür: ${s.workType}`;
                        if (s.explanation)
                            content += `\nNot:  ${s.explanation.length > 50 ? s.explanation.substring(0, 50) + '...' : s.explanation}`;
                        if (sources) content += `\nKaynak: ${sources}`;

                        return content.trim();
                    });

                    rowData.push(cellTexts.join('\n\n---\n\n'));
                } else {
                    rowData.push('-');
                }
            });

            return rowData;
        });

        // --- TABLO BOYUTLANDIRMA VE ORTALAMA ---
        // Toplam genişlik: 62 + (102 * 7) = 776 birim.
        // A4 Yatay genişliği 842 birimdir. (842 - 776) / 2 = 33 birim sol boşluk bırakırsak tablo tam ortalanır.
        const table = {
            headers: [
                {
                    label: 'Saat',
                    property: 'time',
                    width: 62,
                    renderer: timeColumnRenderer,
                },
                {
                    label: 'Pazartesi',
                    property: 'mon',
                    width: 102,
                    renderer: dayCellRenderer,
                },
                {
                    label: 'Salı',
                    property: 'tue',
                    width: 102,
                    renderer: dayCellRenderer,
                },
                {
                    label: 'Çarşamba',
                    property: 'wed',
                    width: 102,
                    renderer: dayCellRenderer,
                },
                {
                    label: 'Perşembe',
                    property: 'thu',
                    width: 102,
                    renderer: dayCellRenderer,
                },
                {
                    label: 'Cuma',
                    property: 'fri',
                    width: 102,
                    renderer: dayCellRenderer,
                },
                {
                    label: 'Cumartesi',
                    property: 'sat',
                    width: 102,
                    renderer: dayCellRenderer,
                },
                {
                    label: 'Pazar',
                    property: 'sun',
                    width: 102,
                    renderer: dayCellRenderer,
                },
            ],
            rows: rows,
        };

        // Tabloyu çiziyoruz
        await doc.table(table, {
            x: 33, // Tabloyu sayfada tam olarak yatay ortalamak için x koordinatını kilitledik
            prepareHeader: () =>
                doc.font('Roboto-Bold').fontSize(10).fillColor('#1A202C'),
            prepareRow: () => doc.font('Roboto').fontSize(9),
        });

        doc.end();
    } catch (error) {
        console.error('Error creating schedule PDF:', error);
        return res
            .status(500)
            .json({ message: 'Sunucu hatası: PDF oluşturulamadı.' });
    }
};
