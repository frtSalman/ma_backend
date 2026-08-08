function normalizeText(text) {
    if (!text) return '';

    return text
        .toLocaleLowerCase('tr-TR')
        .replace(/[.,()]/g, '') // Noktalama işaretlerini sil [cite: 1]
        .replace(/\s+/g, ' ') // Çift boşlukları tek boşluğa indir [cite: 1]
        .trim();
}

export { normalizeText };
