import db from '../utils/database.js';
import { DataTypes } from 'sequelize';

const Payment = db.define(
    'Payment',
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
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'success', 'failed'),
            allowNull: false,
            defaultValue: 'success',
        },
        sendData: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        resultData: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        callbackData: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
    },
    {
        tableName: 'payments',
        indexes: [
            { fields: ['userId'] },
            { fields: ['paymentStatus'] },
            { fields: ['createdAt'] },
        ],
    }
);

export default Payment;
