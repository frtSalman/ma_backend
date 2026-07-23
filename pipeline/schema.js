import Ajv from 'ajv'; //[cite: 1]

const ajv = new Ajv(); //[cite: 1]

const aiOutputSchema = {
    type: 'object',
    properties: {
        header: {
            type: 'object',
            properties: {
                studentName: { type: ['string', 'null'] },
                examName: { type: 'string' },
                examDate: { type: 'string' },
                totalPoint: { type: 'number' },
            },
            required: ['studentName', 'examName', 'totalPoint'],
        },
        scoreSummary: {
            type: 'object',
            description: 'Her ders için özet veriler (D, Y, SS, NET)',
            additionalProperties: {
                type: 'object',
                properties: {
                    D: { type: 'integer' },
                    Y: { type: 'integer' },
                    SS: { type: ['integer', 'null'] },
                    NET: { type: 'number' },
                    subject: { type: 'string' },
                },
            },
        },
        analysis: {
            type: 'object',
            properties: {
                Türkçe: { $ref: '#/definitions/topicArray' },
                Tarih: { $ref: '#/definitions/topicArray' },
                Coğrafya: { $ref: '#/definitions/topicArray' },
                Felsefe: { $ref: '#/definitions/topicArray' },
                Matematik: { $ref: '#/definitions/topicArray' },
                Fizik: { $ref: '#/definitions/topicArray' },
                Kimya: { $ref: '#/definitions/topicArray' },
                Biyoloji: { $ref: '#/definitions/topicArray' },
                'Din Kültürü ve Ahlak Bilgisi': {
                    $ref: '#/definitions/topicArray',
                },
                Geometri: { $ref: '#/definitions/topicArray' },
            },
        },
    },
    definitions: {
        topicArray: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    topic: { type: 'string' },
                    T: { type: 'integer' },
                    D: { type: 'integer' },
                    Y: { type: 'integer' },
                },
                required: ['topic', 'T', 'D', 'Y'],
            },
        },
    },
};

const validateAiOutput = ajv.compile(aiOutputSchema); //[cite: 1]

export { validateAiOutput }; //[cite: 1]
