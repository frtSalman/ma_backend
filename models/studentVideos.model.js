import { DataTypes, literal } from 'sequelize';
import db from '../utils/database.js';

const StudentVideos = db.define(
    'StudentVideos',
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
        playList: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        subject: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        url: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        sourceName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isWatched: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        examType: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        duration: { type: DataTypes.FLOAT, allowNull: true },
        lastConfirmedMoment: { type: DataTypes.FLOAT, allowNull: true },
    },
    {
        tableName: 'student_videos',
        timestamps: true,
        indexes: [
            {
                name: 'student_videos_student_subject_playlist_url_unique',
                unique: true,
                fields: [
                    'studentId',
                    'subject',
                    literal("COALESCE(\"playList\"->>'id', '')"),
                    'url',
                ],
            },
        ],
    }
);

StudentVideos.associate = models => {
    // Bire-Bir ilişki: Her videonun bir tane soru/çözüm seti olur.
    // foreignKey her zaman hedef tablodaki (StudentVideoQuestions) sütun adıdır.
    StudentVideos.hasOne(models.StudentVideoQuestions, {
        foreignKey: 'videoId',
        as: 'questions',
    });

    StudentVideos.belongsTo(models.Users, {
        foreignKey: 'studentId',
        as: 'student',
        onDelete: 'CASCADE',
    });
};

export default StudentVideos;
