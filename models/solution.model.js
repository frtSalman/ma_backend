import db from '../utils/database.js';
import { DataTypes } from 'sequelize';

const Solution = db.define(
    'Solution',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },

        path: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        qId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },

        solution: {
            type: DataTypes.TEXT,
        },

        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'createdAt', // or 'created_at' if snake_case
        },
    },
    {
        timestamps: false, // 🔴 critical
        freezeTableName: true,
    }
);

export default Solution;
