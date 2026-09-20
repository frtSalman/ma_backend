import { DataTypes } from 'sequelize';
import db from '../utils/database.js';

const Cirriculum = db.define(
    'Cirriculum',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        educationLevel: {
            type: DataTypes.ENUM('ortaokul', 'lise', 'mezun'),
            allowNull: false,
        },
        curriculumVersion: {
            type: DataTypes.ENUM('eski', 'maarif', '-'),
            allowNull: false,
        },
        gradeLevel: {
            type: DataTypes.STRING, // '9. Sınıf', '11. Sınıf', 'KPSS' vb.
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING, // 'Matematik', 'Türkçe'
            allowNull: false,
        },
        tema: {
            type: DataTypes.STRING, // Alt tema/ünite adı (varsa)
            allowNull: true,
        },
        topic: {
            type: DataTypes.STRING, // 'Temel Kavramlar'
            allowNull: false,
        },
    },
    {
        tableName: 'topics',
        timestamps: false, // Konular statik olduğu için createdAt, updatedAt gereksiz olabilir
        indexes: [
            {
                fields: ['educationLevel', 'curriculumVersion', 'gradeLevel'],
            },
        ],
    }
);

Cirriculum.associate = models => {
    Cirriculum.hasMany(models.StudentBookProgress, {
        foreignKey: 'topicId',
        as: 'bookProgresses',
        onDelete: 'CASCADE',
    });
};

export default Cirriculum;
