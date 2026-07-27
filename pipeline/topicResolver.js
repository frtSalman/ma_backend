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

/* import { token_sort_ratio, partial_ratio } from 'fuzzball';

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
 */

import { QdrantClient } from '@qdrant/js-client-rest'; // veya kullandığın Qdrant istemcisi
import { getEmbedding } from '../utils/embeddings.js';
import dotenv from 'dotenv';
dotenv.config();

async function resolveTopic(
    normalizedInput,
    oldInput,
    subject,
    dbMasterTopics
) {
    // 1. Exact Match (Birebir Eşleşme - O(1))
    // Metin birebir aynıysa Qdrant'a sorgu atıp maliyet/zaman harcamaya gerek yok.
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

    const qdrant = new QdrantClient({
        url: 'https://qdrant.teachflow.net',
        port: 443,
        checkCompatibility: false,
        apiKey: process.env.QUADRANT_API_KEY,
    });

    // 2. EMBEDDING / VECTOR SEARCH (Qdrant Adımı)
    try {
        // Gelen kazanım cümlesinin embedding (vektör) karşılığını alıyoruz
        const inputVector = await getEmbedding(normalizedInput);

        // Qdrant üzerinde arama yapıyoruz
        const searchResult = await qdrant.search('mufredat_collection', {
            vector: inputVector,
            limit: 1, // En yakın 1 sonucu getir
            filter: {
                // ÇOK KRİTİK: Aramayı mutlaka sadece gelen derse sınırla!
                must: [{ key: 'subject', match: { value: subject } }],
            },
        });

        if (searchResult.length > 0) {
            const topMatch = searchResult[0];

            // Qdrant Cosine Similarity skoru genellikle 0 ile 1 arasındadır.
            // Bunu senin sistemdeki 0-100 güven skoruna çeviriyoruz:
            const confidence = Math.round(topMatch.score * 100);

            // Eğer vektör benzerliği belirlediğin threshold'un üzerindeyse dön
            if (confidence >= 75) {
                return {
                    status: 'resolved_auto_alias',
                    masterTopic: topMatch.payload.topicName, // Qdrant payload'undaki master topic adı
                    confidence: confidence,
                    originalInput: oldInput,
                    normalizedInput: normalizedInput,
                };
            }
        }
    } catch (error) {
        console.error(
            "Qdrant aramasında hata oluştu, fallback'e geçiliyor:",
            error
        );
    }

    // 3. FALLBACK: String tabanlı Fuzzy Match (Sadece Qdrant eşiği geçemezse veya çökerse çalışır)
    let bestMatch = null;
    let highestScore = 0;

    for (const masterTopic of dbMasterTopics) {
        // Eski fuzzball kodların...
    }

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
