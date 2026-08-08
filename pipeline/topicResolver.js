import { QdrantClient } from '@qdrant/js-client-rest'; // veya kullandığın Qdrant istemcisi
import { getEmbedding } from '../utils/embeddings.js';
import dotenv from 'dotenv';
import { token_sort_ratio, partial_ratio } from 'fuzzball';
dotenv.config();

function fuzzyMatch(normalizedInput, dbMasterTopics) {
    const allMatches = dbMasterTopics.map(masterTopic => {
        const sortScore = token_sort_ratio(normalizedInput, masterTopic.topic);
        const partialScore = partial_ratio(normalizedInput, masterTopic.topic);
        const combinedScore = Math.round(sortScore * 0.6 + partialScore * 0.4);
        return { topic: masterTopic.topic, score: combinedScore };
    });

    allMatches.sort((a, b) => b.score - a.score);

    return {
        topic: allMatches?.[0]?.topic,
        confidence: allMatches?.[0]?.score,
    };
}

async function searchInQdrant(normalizedInput, subject, sourceSet) {
    try {
        const qdrant = new QdrantClient({
            url: 'https://qdrant.teachflow.net',
            port: 443,
            checkCompatibility: false,
            apiKey: process.env.QUADRANT_API_KEY,
        });

        const inputVector = await getEmbedding(normalizedInput);

        const searchResult = await qdrant.search('mufredat_collection', {
            vector: inputVector,
            limit: 1,
            filter: {
                must: [
                    { key: 'subject', match: { value: subject } },
                    {
                        key: 'sourceSet',
                        match: { value: sourceSet[0] || sourceSet[1] },
                    },
                ],
            },
        });

        // Check if the array has at least one result
        if (searchResult && searchResult.length > 0) {
            const topMatch = searchResult[0]; // Get the first result object

            // Calculate confidence from the first result's score
            const confidence = Math.round(topMatch.score * 100);

            if (confidence >= 70) {
                return {
                    status: 'vector_resolved',
                    masterTopic: topMatch.payload.topicName, // Access payload from the first result
                    confidence: confidence,
                };
            }
        }
    } catch (error) {
        console.error(
            "Qdrant aramasında hata oluştu, fallback'e geçiliyor:",
            error
        );
    }
    // Return null if no confident match is found
    return null;
}

async function resolveTopic(
    normalizedInput,
    oldInput,
    subject,
    dbMasterTopics,
    sourceSet
) {
    // 1. Exact Match (Birebir Eşleşme - O(1))
    // Metin birebir aynıysa Qdrant'a sorgu atıp maliyet/zaman harcamaya gerek yok.
    const exactMatch = dbMasterTopics.find(
        t => t.topic.toLocaleLowerCase('tr-TR') === normalizedInput
    );
    if (exactMatch) {
        return {
            status: 'exact_resolved',
            masterTopic: exactMatch.topic.toLocaleLowerCase('tr-TR'),
            originalInput: oldInput,
            normalizedInput: normalizedInput,
            confidence: 100,
        };
    }

    // 2. Fuzzy Match (Levenshtein-based)
    // Vektör araması öncesi hızlı bir metin bazlı kontrol.
    const bestMatch = fuzzyMatch(normalizedInput, dbMasterTopics);

    if (bestMatch.confidence >= 70) {
        // 70 ve üzeri skoru, vektör aramasına gerek duymayacak kadar iyi kabul ediyoruz.
        // `fuzzyMatch` artık en iyi 3 sonucu döndürüyor, biz en iyisini alıyoruz.
        return {
            status: 'fuzzy_resolved',
            masterTopic: bestMatch.topic.toLocaleLowerCase('tr-TR'),
            confidence: bestMatch.confidence,
            originalInput: oldInput,
            normalizedInput: normalizedInput,
        };
    }

    // 3. EMBEDDING / VECTOR SEARCH (Qdrant Adımı)
    const vectorResolution = await searchInQdrant(
        normalizedInput,
        subject,
        sourceSet
    );

    if (vectorResolution) {
        return {
            ...vectorResolution,
            originalInput: oldInput,
            normalizedInput: normalizedInput,
        };
    }

    return {
        status: 'requires_new_topic',
        masterTopic: null, // Eğer Qdrant'dan bir eşleşme yoksa null dönebiliriz
        confidence: 0,
        originalInput: oldInput,
        normalizedInput: normalizedInput,
    };
}

export { resolveTopic };
