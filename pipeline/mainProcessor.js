import { validateAiOutput } from './schema.js';
import { normalizeText } from './normalizer.js';
import { mergeDuplicateTopics } from './merger.js';
import { resolveTopic } from './topicResolver.js';
import { Op } from 'sequelize';
import models from '../models/index.model.js';

const { Cirriculum } = models;

async function processExamData(aiJsonPayload, grade) {
    try {
        const sourceSet =
            aiJsonPayload.header.examType !== 'LGS'
                ? [
                      'xHData',
                      'mHData',
                      'kpps_onlisans',
                      'kpss_lisans',
                      'ales',
                      'dgs',
                  ]
                : ['xMData', 'mMData'];

        const gradeLevel =
            grade === '5' || grade === '6' || grade === '7' || grade === '8'
                ? [
                      '5. Sınıf',
                      '6. Sınıf',
                      '7. Sınıf',
                      '8. Sınıf',
                      'Ortaokul Genel',
                  ]
                : [
                      '9. Sınıf',
                      '10. Sınıf',
                      '11. Sınıf',
                      '12. Sınıf',
                      'Lise Genel',
                      'Kpss Ön Lisans',
                      'Kpss Lisans',
                      'ALES',
                      'DGS',
                  ];

        // DB'den mevcut aliasları ve master topicleri çekiyoruz (Örnek)
        const results = [];

        for (const subject of Object.keys(aiJsonPayload.analysis)) {
            // Aşama 7: Subject Validation [cite: 1]
            // (Burada subjectName DB'deki master subjectler ile kontrol edilmeli)

            const masterTopics = await Cirriculum.findAll({
                where: {
                    subject: subject,
                    gradeLevel: { [Op.in]: gradeLevel },
                },
            });

            let processedTopics = aiJsonPayload.analysis[subject].map(
                topic => ({
                    ...topic,
                    oldName: topic.topic, // Aşama 5 [cite: 1]
                    normalizedName: normalizeText(topic.topic), // Aşama 5 [cite: 1]
                })
            );

            // Aşama 6: Duplicate Merge [cite: 1]
            processedTopics = mergeDuplicateTopics(processedTopics);

            for (const topic of processedTopics) {
                const { T, D, Y } = topic;
                // Aşama 9, 10, 11: Alias Lookup ve Fuzzy Match [cite: 1]
                const resolution = await resolveTopic(
                    topic.normalizedName,
                    topic.oldName,
                    subject,
                    masterTopics,
                    sourceSet
                );

                results.push({
                    subject: subject,
                    T,
                    D,
                    Y,
                    ...resolution,
                });
            }
        }

        // Aşama 15: Final Save [cite: 1]
        // resolved dizisindeki veriler exam_analysis tablosuna yazılır.
        return results; // Frontend Dashboard'a dönülecek veri
    } catch (error) {
        console.error('Error processing exam data:', error.message);
        throw error;
    }
}

export { processExamData };
