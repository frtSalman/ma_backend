import { DataTypes } from 'sequelize';
import db from '../utils/database.js';

const StudentBookProgress = db.define(
    'StudentBookProgress',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        studentId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        topicId: {
            type: DataTypes.INTEGER, // Cirriculum tablosundaki ID
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bookName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isCompleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        tableName: 'student_book_progresses',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['studentId', 'topicId', 'bookName'],
            },
        ],
    }
);

StudentBookProgress.associate = models => {
    StudentBookProgress.belongsTo(models.Users, {
        foreignKey: 'studentId',
        as: 'student',
        onDelete: 'CASCADE',
    });
    StudentBookProgress.belongsTo(models.Cirriculum, {
        foreignKey: 'topicId',
        as: 'topic',
        onDelete: 'CASCADE',
    });
};

export default StudentBookProgress;
