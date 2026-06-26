import { DataTypes } from 'sequelize';
import db from '../utils/database.js';

const StudentVideoQuestions = db.define(
    'StudentVideoQuestions',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        videoId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        videoQuestions: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
    },
    {
        tableName: 'student_video_questions',
        timestamps: true,
    }
);

StudentVideoQuestions.associate = models => {
    StudentVideoQuestions.belongsTo(models.StudentVideos, {
        foreignKey: 'videoId',
        as: 'video',
        onDelete: 'CASCADE',
    });
};

export default StudentVideoQuestions;
