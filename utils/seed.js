import sequelize from './database.js';
import { xHData, mHData } from './lise_mufredat.js';
import { mMData, xMData } from './orta_mufredat.js';
import Cirriculum from '../models/cirriculum.model.js';

async function seedDatabase() {
    try {
        // Veritabanı bağlantısını doğrula ve modelleri senkronize et
        await sequelize.authenticate();
        await sequelize.sync();

        // Mevcut verileri temizlemek istersen (Dikkat: Sadece ilk kurulumda açın!)
        await Cirriculum.destroy({ where: {} });

        const topicsToInsert = [];

        // Veriyi çözümleyen yardımcı fonksiyon
        const parseCurriculum = (data, educationLevel, defaultGrade) => {
            for (const [subject, subjectData] of Object.entries(data)) {
                // Durum 1: Eğer doğrudan bir dizi (Array) ise (Örn: Matematik: ["Temel Kavramlar", ...])
                if (Array.isArray(subjectData)) {
                    subjectData.forEach(topic => {
                        topicsToInsert.push({
                            educationLevel,
                            curriculumVersion: 'eski', // İhtiyaca göre 'eski' veya 'yeni'
                            gradeLevel: defaultGrade, // 'Lise Genel' veya 'Ortaokul Genel'
                            subject,
                            tema: null,
                            topic,
                        });
                    });
                }
                // Durum 2: Eğer iç içe Obje ise (Örn: 9. Sınıf -> 1. Tema -> [Konular])
                else if (typeof subjectData === 'object') {
                    for (const [gradeLevel, gradeData] of Object.entries(
                        subjectData
                    )) {
                        // Eğer sınıf seviyesinin altı direkt dizi ise
                        if (Array.isArray(gradeData)) {
                            gradeData.forEach(topic => {
                                topicsToInsert.push({
                                    educationLevel,
                                    curriculumVersion: 'maarif',
                                    gradeLevel,
                                    subject,
                                    tema: null,
                                    topic,
                                });
                            });
                        }
                        // Sınıf seviyesinin altında Üniteler/Temalar varsa
                        else if (typeof gradeData === 'object') {
                            for (const [tema, topics] of Object.entries(
                                gradeData
                            )) {
                                if (Array.isArray(topics)) {
                                    topics.forEach(topic => {
                                        topicsToInsert.push({
                                            educationLevel,
                                            curriculumVersion: 'maarif',
                                            gradeLevel, // '9. Sınıf' vb.
                                            subject,
                                            tema, // '1. Tema - İnsan İlişkisi...' vb.
                                            topic,
                                        });
                                    });
                                }
                            }
                        }
                    }
                }
            }
        };

        console.log('Veriler çözümleniyor...');
        // Lise müfredatını işle (Düz listeler için varsayılan sınıf: 'Lise Genel' veya 'YKS')
        parseCurriculum(xHData, 'lise', 'Lise Genel');
        parseCurriculum(mHData, 'lise', 'Maarif');

        // Ortaokul müfredatını işle (Düz listeler için varsayılan sınıf: 'Ortaokul Genel' veya 'LGS')
        parseCurriculum(mMData, 'ortaokul', 'Maarif');
        parseCurriculum(xMData, 'ortaokul', 'Ortaokul Genel');

        console.log(
            `Toplam ${topicsToInsert.length} adet konu bulundu. Veritabanına yazılıyor...`
        );

        // BulkCreate ile tek seferde tüm diziyi veritabanına ekle
        await Cirriculum.bulkCreate(topicsToInsert, {
            ignoreDuplicates: true, // Eğer önceden eklenmiş aynı id'li veri varsa atlar
        });

        console.log('✅ Müfredat veritabanına başarıyla yüklendi!');
        process.exit(0); // İşlem bitince script'i sonlandır
    } catch (error) {
        console.error('❌ Veri yüklenirken hata oluştu:', error);
        process.exit(1);
    }
}

// Fonksiyonu çalıştır
seedDatabase();
