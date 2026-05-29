/**
 * Öğrencinin haftalık çalışma verilerinden dinamik pdfmake döküman yapısı üretir.
 * @param {string} studentName - Öğrencinin adı soyadı
 * @param {Array} scheduleItems - Öğrenciye ait ham ders/program kayıtları dizisi
 * @returns {Object} pdfmake docDefinition nesnesi
 */
export default function generateScheduleDocDefinition(
    studentName,
    scheduleItems
) {
    const days = [
        'Pazartesi',
        'Salı',
        'Çarşamba',
        'Perşembe',
        'Cuma',
        'Cumartesi',
        'Pazar',
    ];
    const timeSlots = ['08.00-12.00', '12.00-18.00', '18.00-24.00'];

    // 1. Verileri Saat Dilimi ve Günlere göre matris yapısında gruplayalım
    const groupedData = {};
    timeSlots.forEach(slot => {
        groupedData[slot] = {};
        days.forEach(day => {
            groupedData[slot][day] = [];
        });
    });

    scheduleItems.forEach(item => {
        const slot = item.timeRange;
        const day = item.day;
        if (groupedData[slot] && groupedData[slot][day]) {
            groupedData[slot][day].push(item);
        }
    });

    // 2. pdfmake için tablo gövdesini (body) inşa edelim
    const tableBody = [];

    // Başlık satırını ekle (Saat + Günler)
    const headerRow = [
        { text: 'Saat', style: 'tableHeader' },
        ...days.map(day => ({ text: day, style: 'tableHeader' })),
    ];
    tableBody.push(headerRow);

    // Saat dilimi satırlarını doldur
    timeSlots.forEach(slot => {
        const row = [];

        // Saat Sütunu Hücresi (Çizgi işaretini alt alta kırarak alanı daraltıyoruz)
        const slotText = slot.replace('-', '\n-\n');
        row.push({ text: slotText, style: 'timeHeader' });

        // Gün Sütunları Hücreleri
        days.forEach(day => {
            const dayItems = groupedData[slot][day];

            if (dayItems.length === 0) {
                // Eğer o saat diliminde ders yoksa boş hücre bırak
                row.push({ text: '', style: 'emptyCell' });
            } else {
                const cellStack = [];

                dayItems.forEach((item, index) => {
                    // Aynı hücrede birden fazla kart varsa araya ince şık bir çizgi çekelim
                    if (index > 0) {
                        cellStack.push({
                            canvas: [
                                {
                                    type: 'line',
                                    x1: 0,
                                    y1: 4,
                                    x2: 95,
                                    y2: 4,
                                    lineWidth: 0.5,
                                    lineColor: '#e2e8f0',
                                },
                            ],
                            margin: [0, 4, 0, 6],
                        });
                    }

                    // Ders Adı
                    cellStack.push({
                        text: item.subject || '',
                        style: 'cellSubject',
                    });

                    // Konu
                    if (item.topic) {
                        cellStack.push({
                            text: `Konu: ${item.topic}`,
                            style: 'cellTopic',
                        });
                    }

                    // Çalışma Türü (Soru Çözümü, Konu Çalışması vb.)
                    if (item.workType) {
                        cellStack.push({
                            text: `Tür: ${item.workType}`,
                            style: 'cellDetail',
                        });
                    }

                    // Açıklama / Not (Örn: Soru aralıkları)
                    if (item.explanation) {
                        cellStack.push({
                            text: `Not: ${item.explanation}`,
                            style: 'cellDetail',
                        });
                    }

                    // Kitap Kaynakları (JSON string ise parse et, array ise direkt map'le)
                    if (item.bookSources) {
                        try {
                            const books =
                                typeof item.bookSources === 'string'
                                    ? JSON.parse(item.bookSources)
                                    : item.bookSources;
                            if (Array.isArray(books) && books.length > 0) {
                                const bookNames = books
                                    .map(b => b.sourceName)
                                    .filter(Boolean)
                                    .join(', ');
                                if (bookNames) {
                                    cellStack.push({
                                        text: `Kaynak: ${bookNames}`,
                                        style: 'cellDetail',
                                    });
                                }
                            }
                        } catch (e) {
                            /* Hata durumunda pas geç */
                        }
                    }

                    // Video Kaynakları
                    if (item.videoSources) {
                        try {
                            const videos =
                                typeof item.videoSources === 'string'
                                    ? JSON.parse(item.videoSources)
                                    : item.videoSources;
                            if (Array.isArray(videos) && videos.length > 0) {
                                const videoNames = videos
                                    .map(v => v.sourceName)
                                    .filter(Boolean)
                                    .join(', ');
                                if (videoNames) {
                                    cellStack.push({
                                        text: `Video: ${videoNames}`,
                                        style: 'cellDetail',
                                    });
                                }
                            }
                        } catch (e) {
                            /* Hata durumunda pas geç */
                        }
                    }
                });

                row.push({ stack: cellStack });
            }
        });

        tableBody.push(row);
    });

    // 3. Tam docDefinition yapısını döndür
    return {
        pageSize: 'A4',
        pageOrientation: 'landscape', // Yatay görünüm tablonun sığması için kritik
        pageMargins: [30, 40, 30, 40],

        styles: {
            title: {
                fontSize: 18,
                bold: true,
                color: '#1e3a8a',
                alignment: 'center',
            },
            subtitle: {
                fontSize: 12,
                color: '#4b5563',
                alignment: 'center',
            },
            tableHeader: {
                bold: true,
                fontSize: 11,
                color: 'white',
                fillColor: '#1e3a8a',
                alignment: 'center',
                margin: [0, 6, 0, 6],
            },
            timeHeader: {
                bold: true,
                fontSize: 10,
                color: '#1e3a8a',
                fillColor: '#f8fafc',
                alignment: 'center',
                margin: [0, 10, 0, 10],
            },
            cellSubject: {
                fontSize: 10,
                bold: true,
                color: '#2563eb',
                margin: [0, 2, 0, 1],
            },
            cellTopic: {
                fontSize: 8.5,
                bold: true,
                color: '#334155',
                margin: [0, 0, 0, 1],
            },
            cellDetail: {
                fontSize: 8,
                color: '#64748b',
                margin: [0, 0, 0, 1],
            },
            emptyCell: {
                fillColor: '#fbfbfb',
            },
        },

        content: [
            { text: 'Haftalık Çalışma Programı', style: 'title' },
            {
                text: `Öğrenci: ${studentName}`,
                style: 'subtitle',
                margin: [0, 2, 0, 20],
            },
            {
                table: {
                    headerRows: 1,
                    // Genişlikler: Saat sütunu %8, geri kalan 7 gün eşit dağıtıldı (~%13.1)
                    widths: [
                        '8%',
                        '13.1%',
                        '13.1%',
                        '13.1%',
                        '13.1%',
                        '13.1%',
                        '13.1%',
                        '13.1%',
                    ],
                    body: tableBody,
                },
                layout: {
                    hLineWidth: function (i, node) {
                        return i === 0 || i === node.table.body.length
                            ? 1.5
                            : 0.5;
                    },
                    vLineWidth: function (i, node) {
                        return i === 0 || i === node.table.widths.length
                            ? 1.5
                            : 0.5;
                    },
                    hLineColor: function (i) {
                        return i <= 1 ? '#1e3a8a' : '#cbd5e1';
                    },
                    vLineColor: function (i) {
                        return i === 0 || i === 8 ? '#1e3a8a' : '#cbd5e1';
                    },
                    paddingLeft: function () {
                        return 6;
                    },
                    paddingRight: function () {
                        return 6;
                    },
                    paddingTop: function () {
                        return 6;
                    },
                    paddingBottom: function () {
                        return 6;
                    },
                },
            },
        ],
    };
}
