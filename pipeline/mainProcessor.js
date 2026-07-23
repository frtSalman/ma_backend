import { validateAiOutput } from './schema.js';
import { normalizeText } from './normalizer.js';
import { mergeDuplicateTopics } from './merger.js';
import { resolveTopic } from './topicResolver.js';
import models from '../models/index.model.js';

const { Cirriculum } = models;

async function processExamData(aiJsonPayload) {
    // Aşama 4: JSON Validation [cite: 1]
    if (!validateAiOutput(aiJsonPayload)) {
        console.error('AI JSON Validation Error:', validateAiOutput.errors);
    }

    // DB'den mevcut aliasları ve master topicleri çekiyoruz (Örnek)
    const results = [];

    for (const subject of Object.keys(aiJsonPayload.analysis)) {
        // Aşama 7: Subject Validation [cite: 1]
        // (Burada subjectName DB'deki master subjectler ile kontrol edilmeli)

        const masterTopics = await Cirriculum.findAll({
            where: { subject: subject },
        });

        let processedTopics = aiJsonPayload.analysis[subject].map(topic => ({
            ...topic,
            oldName: topic.topic, // Aşama 5 [cite: 1]
            normalizedName: normalizeText(topic.topic), // Aşama 5 [cite: 1]
        }));

        // Aşama 6: Duplicate Merge [cite: 1]
        processedTopics = mergeDuplicateTopics(processedTopics);

        for (const topic of processedTopics) {
            // Aşama 9, 10, 11: Alias Lookup ve Fuzzy Match [cite: 1]
            const resolution = await resolveTopic(
                topic.normalizedName,
                topic.oldName,
                masterTopics
            );

            results.push({
                subject: subject,
                ...topic,
                ...resolution,
            });
        }
    }

    // Aşama 15: Final Save [cite: 1]
    // resolved dizisindeki veriler exam_analysis tablosuna yazılır.
    return results; // Frontend Dashboard'a dönülecek veri
}

export { processExamData };
