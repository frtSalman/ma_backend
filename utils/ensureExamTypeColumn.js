export const ensureExamTypeColumn = async db => {
    const Exam = db.model('Exam');
    const tableName = Exam.getTableName();
    const queryInterface = db.getQueryInterface();
    const columns = await queryInterface.describeTable(tableName);

    // sync() mevcut tablolara yeni sütun eklemez.
    if (!columns.examType) {
        const { type, allowNull } = Exam.getAttributes().examType;
        await queryInterface.addColumn(tableName, 'examType', {
            type,
            allowNull,
        });
    }
};
