import db from '../utils/database.js';
import { DataTypes } from 'sequelize';

const Subscription = db.define(
    'Subscription',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        conversationId: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        callbackData: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        trialEndDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        nextBillingDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        studentNumQuota: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 10,
        },
        subStatus: {
            type: DataTypes.ENUM('active', 'passive', 'trial'),
            allowNull: false,
            defaultValue: 'trial',
        },
        subPlan: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        studentNum: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        aiAnalysedExamNumQuota: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 8,
        },
        aiSolvedQuestionNumQuota: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 150,
        },
        aiAnalysedExamNum: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        aiSolvedQuestionNum: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        canceledAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: 'subscriptions',
    }
);

Subscription.associate = models => {
    Subscription.belongsTo(models.Users, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE',
    });
};

export default Subscription;
