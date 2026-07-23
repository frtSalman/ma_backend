/* import { ratio } from 'fuzzball';

// Not: Gerçek senaryoda bu veriler PostgreSQL'den (SELECT id, name, alias FROM topic_aliases) çekilir.
async function resolveTopic(normalizedInput, oldInput, dbMasterTopics) {
    // 1. Exact Match (O(1) Lookup) [cite: 1]
    const exactMatch = dbMasterTopics.find(t => t.topic === normalizedInput);
    if (exactMatch) {
        return {
            status: 'resolved',
            masterTopicId: exactMatch.topicId,
            originalInput: oldInput,
            normalizedInput: normalizedInput,
            confidence: 100,
        };
    }

    // 2. Fuzzy Match [cite: 1]
    let bestMatch = null;
    let highestScore = 0;

    for (const masterTopic of dbMasterTopics) {
        // Fuzzball ratio hesaplaması (RapidFuzz alternatifi)
        const score = ratio(normalizedInput, masterTopic.topic);
        if (score > highestScore) {
            highestScore = score;
            bestMatch = masterTopic.topic;
        }
    }

    // 3. Confidence Kararı [cite: 1]
    if (highestScore > 70) {
        return {
            status: 'resolved_auto_alias',
            masterTopic: bestMatch,
            confidence: highestScore,
            originalInput: oldInput,
            normalizedInput: normalizedInput,
        };
    } else {
        return {
            status: 'requires_new_topic',
            confidence: highestScore,
            originalInput: oldInput,
            normalizedInput: normalizedInput,
            masterTopic: bestMatch,
        };
    }
}

export { resolveTopic };
 */

import { token_sort_ratio, partial_ratio } from 'fuzzball';

async function resolveTopic(
    normalizedInput,
    oldInput,
    subject,
    dbMasterTopics
) {
    // 2. Exact Match (Birebir Eşleşme)
    const exactMatch = dbMasterTopics.find(t => t.topic === normalizedInput);
    if (exactMatch) {
        return {
            status: 'resolved',
            masterTopicId: exactMatch.topicId,
            originalInput: oldInput,
            normalizedInput: normalizedInput,
            confidence: 100,
        };
    }

    // 3. Fuzzy Match
    let bestMatch = null;
    let highestScore = 0;

    for (const masterTopic of dbMasterTopics) {
        const cleanInput = normalizedInput.toLowerCase();
        const cleanMaster = masterTopic.topic.toLowerCase();

        // Eğer ana konu adı doğrudan girdinin içinde geçiyorsa (ör: "Kümeler" -> "küme")
        if (
            cleanInput.includes(cleanMaster) ||
            cleanMaster.includes(cleanInput)
        ) {
            // Doğrudan çok yüksek bir güven skoru verip öne çıkarabiliriz
            highestScore = 95;
            bestMatch = masterTopic.topic;
            break;
        }

        // Kelime sırasından bağımsız eşleşme için token_sort_ratio
        const sortScore = token_sort_ratio(normalizedInput, masterTopic.topic);

        // Kazanım cümleleri / uzun metinler için partial_ratio
        const partialScore = partial_ratio(normalizedInput, masterTopic.topic);

        // İkisinin dengeli ağırlığı (Kazanım cümlelerini yakalamak için)
        const combinedScore = Math.round(sortScore * 0.6 + partialScore * 0.4);

        if (combinedScore > highestScore) {
            highestScore = combinedScore;
            bestMatch = masterTopic.topic;
        }
    }

    // 4. Threshold (Eşik) Kararı
    const isResolved = highestScore >= 75;

    return {
        status: isResolved ? 'resolved_auto_alias' : 'requires_new_topic',
        masterTopic: bestMatch,
        confidence: highestScore,
        originalInput: oldInput,
        normalizedInput: normalizedInput,
    };
}

export { resolveTopic };
