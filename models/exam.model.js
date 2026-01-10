import { DataTypes } from 'sequelize';
import db from '../utils/database.js';
import Users from './user.model.js';

const Exam = db.define(
    'Exam',
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
        studentId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            references: {
                model: Users,
                key: 'id',
            },
        },
        teacherId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            references: {
                model: Users,
                key: 'id',
            },
        },
        examTitle: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        examDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        scoreSummary: {
            type: DataTypes.ARRAY(DataTypes.JSON),
            allowNull: true,
        },
        analysis: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'createdAt',
        },
    },
    {
        timestamps: false, // 🔴 critical
    }
);

Exam.associate = models => {
    Exam.belongsTo(models.Users, {
        foreignKey: 'studentId',
        as: 'student',
        onDelete: 'CASCADE',
    });

    Exam.belongsTo(models.Users, {
        foreignKey: 'teacherId',
        as: 'teacher',
        onDelete: 'CASCADE',
    });
};

export default Exam;
