import db from '../utils/database.js';
import bcrypt from 'bcrypt';
import { DataTypes } from 'sequelize';

const Users = db.define(
    'Users',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        grade: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role: {
            type: DataTypes.ENUM('teacher', 'student', 'admin', 'parent'),
            allowNull: false,
            defaultValue: 'teacher',
        },
        teacherId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        parentId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        books: {
            type: DataTypes.JSONB,
            defaultValue: {},
            allowNull: true,
        },
        videos: {
            type: DataTypes.JSONB,
            defaultValue: {},
            allowNull: true,
        },
        logo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        lastLogin: DataTypes.DATE,
        isVerified: DataTypes.BOOLEAN,
        resetPasswordToken: DataTypes.STRING,
        resetPasswordTokenExpiresAt: DataTypes.DATE,
        verificationToken: DataTypes.STRING,
        verificationTokenExpiresAt: DataTypes.DATE,
    },
    {
        hooks: {
            beforeCreate: async user => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async user => {
                // Only hash if password is modified
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
        tableName: 'users',
    }
);

Users.associate = models => {
    // A teacher can have many students
    Users.hasMany(models.Users, {
        as: 'students',
        foreignKey: 'teacherId',
        constraints: false,
        scope: { role: 'student' },
        onDelete: 'CASCADE',
    });

    // A parent can have many students (children)
    Users.hasMany(models.Users, {
        as: 'children',
        foreignKey: 'parentId',
        constraints: false,
        scope: { role: 'student' },
        onDelete: 'CASCADE', // When parent is deleted, children are deleted
    });

    // A student belongs to one parent
    Users.belongsTo(models.Users, {
        as: 'parent',
        foreignKey: 'parentId',
        constraints: false,
        onDelete: 'SET NULL', // When student is deleted, don't delete parent
    });

    // A student belongs to one teacher
    Users.belongsTo(models.Users, {
        as: 'teacher',
        foreignKey: 'teacherId',
        constraints: false,
        onDelete: 'CASCADE',
    });

    Users.hasMany(models.Homework, {
        foreignKey: 'studentId',
        as: 'homeworks',
        onDelete: 'CASCADE',
    });
    Users.hasMany(models.StatEntry, {
        foreignKey: 'studentId',
        as: 'stat_entries',
        onDelete: 'CASCADE',
    });
    Users.hasMany(models.Timetable, {
        foreignKey: 'studentId',
        as: 'timetables',
        onDelete: 'CASCADE',
    });
    Users.hasMany(models.UnsolvedQuestion, {
        foreignKey: 'studentId',
        onDelete: 'CASCADE',
    });

    Users.hasMany(models.UnsolvedQuestion, {
        foreignKey: 'teacherId',
        onDelete: 'CASCADE',
    });
    Users.hasMany(models.Exam, {
        foreignKey: 'studentId',
        as: 'exams',
        onDelete: 'CASCADE',
    });
    Users.hasMany(models.StudentBookProgress, { foreignKey: 'studentId' });
    Users.hasMany(models.StudentVideos, { foreignKey: 'studentId' });
    Users.hasMany(models.StudySchedule, { foreignKey: 'studentId' });
    Users.hasMany(models.StudySchedule, { foreignKey: 'teacherId' });
    Users.hasMany(models.Subscription, {
        foreignKey: 'userId',
        as: 'subscriptions',
        onDelete: 'CASCADE',
    });
};

export default Users;
