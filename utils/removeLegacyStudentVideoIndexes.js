export const removeLegacyStudentVideoIndexes = async db => {
    const queryInterface = db.getQueryInterface();
    const tableName = 'student_videos';

    // sync({ alter: true }) yeni indeksleri ekler, eski başlık indeksini kaldırmaz.
    await db.transaction(async transaction => {
        const indexes = await queryInterface.showIndex(tableName, {
            transaction,
        });
        const legacyIndexes = indexes.filter(index => {
            const fields = index.fields.map(field => field.attribute);
            return (
                index.unique &&
                fields.length === 2 &&
                fields.includes('studentId') &&
                fields.includes('sourceName')
            );
        });

        for (const index of legacyIndexes) {
            const quotedTable = queryInterface.queryGenerator.quoteTable(
                tableName
            );
            const quotedIndex = queryInterface.queryGenerator.quoteIdentifier(
                index.name
            );
            await db.query(
                `ALTER TABLE ${quotedTable} DROP CONSTRAINT IF EXISTS ${quotedIndex}`,
                { transaction }
            );
            await queryInterface.removeIndex(tableName, index.name, {
                transaction,
            });
        }
    });
};
