import db from '../utils/database.js';
import { DataTypes } from 'sequelize';

const Solution = db.define('Solution', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    path: { type: DataTypes.STRING, allowNull: false },
    solution: { type: DataTypes.TEXT, allowNull: true },
});

export default Solution;
