import { DataTypes } from 'sequelize';
import db from '../utils/database.js';

const StudySchedule = db.define(
    'StudySchedule',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        teacherId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        studentId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        studentName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        day: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        timeRange: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        topic: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tematic: {
            type: DataTypes.STRING,
            allowNull: true, // Optional as seen in your JSX conditionally rendering it
        },
        checked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false, // Optional as seen in your JSX conditionally rendering it
        },
        generalRep: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        explanation: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: true,
        },
        deadline: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        workType: {
            type: DataTypes.STRING,
            defaultValue: 'Konu Anlatımı',
            allowNull: false,
            enum: ['Konu Anlatımı', 'Soru Çözümü'],
        },
        bookSources: {
            // [{sourceName: 'Kitap Adı', url: 'https://...'}, ...]
            type: DataTypes.JSONB,
            defaultValue: [],
            allowNull: true,
        },
        videoSources: {
            type: DataTypes.JSONB,
            defaultValue: [],
            allowNull: true,
        },
    },
    {
        timestamps: true,
    }
);

export default StudySchedule;
