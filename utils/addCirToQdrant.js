import { GoogleGenAI } from '@google/genai';
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

// Veri dosyalarından importlar (dosya yollarını kendi yapına göre ayarla)
import { xHData, mHData } from './lise_mufredat.js';
import { mMData, xMData } from './orta_mufredat.js';

dotenv.config();

// 1. İSTEMCİ KURULUMLARI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const qdrant = new QdrantClient({
    url: 'http://127.0.0.1',
    checkCompatibility: false,
    apiKey: process.env.QUADRANT_API_KEY,
});

const COLLECTION_NAME = 'mufredat_collection';
const VECTOR_SIZE = 768; // Gemini text-embedding-004 boyutu

// 2. VERİLERİ DÜZLEŞTİRME (FLATTENING)
// Qdrant'a yüklemeden önce tüm farklı veri tiplerini standart bir dizi formatına getiriyoruz.
function prepareDocuments() {
    const docs = [];

    // xHData İşleme (YKS/Lise Konuları)
    for (const [subject, topics] of Object.entries(xHData)) {
        topics.forEach(topic => {
            docs.push({
                text: `${subject} - ${topic}`, // Embedding alınacak arama metni
                payload: {
                    subject,
                    topicName: topic,
                    sourceSet: 'xHData',
                },
            });
        });
    }

    // xMData İşleme (LGS Konuları)
    for (const [subject, topics] of Object.entries(xMData)) {
        topics.forEach(topic => {
            docs.push({
                text: `${subject} - ${topic}`,
                payload: {
                    subject,
                    topicName: topic,
                    sourceSet: 'xMData',
                },
            });
        });
    }

    // mHData & mMData İşleme (Nested: Ders -> Sınıf -> Tema -> Konular)
    const processNestedData = (data, sourceName) => {
        for (const [subject, grades] of Object.entries(data)) {
            for (const [grade, themes] of Object.entries(grades)) {
                for (const [theme, topics] of Object.entries(themes)) {
                    topics.forEach(topic => {
                        docs.push({
                            text: `${subject} ${grade} ${theme}: ${topic}`,
                            payload: {
                                subject,
                                grade,
                                theme,
                                topicName: topic,
                                sourceSet: sourceName,
                            },
                        });
                    });
                }
            }
        }
    };

    processNestedData(mHData, 'mHData');
    processNestedData(mMData, 'mMData');

    return docs;
}

// 3. GEMINI EMBEDDING ALMA
async function generateEmbeddings(texts) {
    // Gemini text-embedding-004 modelini çağırıyoruz
    const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: texts,
    });

    // Çoklu isteklerde response.embeddings dizisi döner
    return response.embeddings.map(e => e.values);
}

// 4. QDRANT KOLEKSİYONU OLUŞTURMA VE YÜKLEME
async function main() {
    console.log('🚀 Müfredat verileri hazırlanıyor...');
    const documents = prepareDocuments();
    console.log(
        `📦 Toplam ${documents.length} adet müfredat başlığı/kazanımı işlenecek.`
    );

    // Koleksiyon var mı kontrol et, yoksa oluştur
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
        c => c.name === COLLECTION_NAME
    );

    if (!exists) {
        console.log(`🛠️ "${COLLECTION_NAME}" koleksiyonu oluşturuluyor...`);
        await qdrant.createCollection(COLLECTION_NAME, {
            vectors: {
                size: VECTOR_SIZE,
                distance: 'Cosine', // Metin benzerliklerinde Cosine varsayılandır
            },
        });
    } else {
        console.log(`ℹ️ "${COLLECTION_NAME}" koleksiyonu zaten mevcut.`);
    }

    // Batching (Sınırlara takılmamak için 50'şerli gruplarla yükleme)
    const BATCH_SIZE = 50;
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);
        const texts = batch.map(doc => doc.text);

        console.log(
            `⏳ [${i + 1} - ${Math.min(i + BATCH_SIZE, documents.length)} / ${documents.length}] Embedding'ler üretiliyor...`
        );

        try {
            const embeddings = await generateEmbeddings(texts);

            const points = batch.map((doc, idx) => ({
                id: i + idx + 1, // Sayısal ID veya crypto.randomUUID()
                vector: embeddings[idx],
                payload: doc.payload,
            }));

            await qdrant.upsert(COLLECTION_NAME, {
                points: points,
            });

            console.log(`✅ Batch başarıyla Qdrant'a yüklendi.`);
        } catch (err) {
            console.error(`❌ Batch işlenirken hata oluştu:`, err);
        }
    }

    console.log(
        '🎉 Tüm müfredat verileri başarıyla Qdrant VPS sunucuna yüklendi!'
    );
}

main();
