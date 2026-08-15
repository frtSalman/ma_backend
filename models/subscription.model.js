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
        customerReferenceCode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        productReferenceCode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        pricingPlanReferenceCode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        subscriptionReferenceCode: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'PENDING',
        },
        paymentStatus: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        currency: {
            type: DataTypes.STRING,
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
        canceledAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        rawResponse: {
            type: DataTypes.JSONB,
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
