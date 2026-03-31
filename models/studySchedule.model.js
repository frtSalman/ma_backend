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
    },
    {
        timestamps: true,
    }
);

export default StudySchedule;
