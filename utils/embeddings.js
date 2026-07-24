const OLLAMA_URL = 'https://ollama-10711453.teachflow.net';

// Çoklu metinler (batch) için Ollama Embedding fonksiyonu
async function generateEmbeddings(texts) {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/embed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'nomic-embed-text',
                input: texts,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Ollama API Hatası (${response.status}): ${errorText}`
            );
        }

        const data = await response.json();
        return data.embeddings;
    } catch (error) {
        console.error(
            'Dış Ollama adresi üzerinden embedding alınamadı:',
            error
        );
        throw error;
    }
}

// Tekli metin araması için (resolveTopic içinde kullanılacak)
async function getEmbedding(text) {
    const embeddings = await generateEmbeddings([text]);
    return embeddings[0];
}

export { generateEmbeddings, getEmbedding };
