import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import db from './utils/database.js';
import authRoutes from './routes/auth.route.js';
import timeTableRoutes from './routes/timeTable.route.js';
import userRoutes from './routes/user.route.js';
import homeworkRoutes from './routes/homework.route.js';
import statisticRoutes from './routes/statistic.route.js';
import uploadRoutes from './routes/upload.route.js';
import solutionRoutes from './routes/solution.route.js';
import examRoutes from './routes/exam.route.js';
import scheduleRoutes from './routes/studySchedule.route.js';
import studentProgressRoutes from './routes/studentProgress.route.js';
import studentVideosRoutes from './routes/studentVideos.route.js';

dotenv.config();
const app = express();
const PORT = 5000;

const allowedOrigins = [
    'https://app.teachflow.net',
    'https://api.teachflow.net',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://192.168.1.119:3000',
    'http://192.168.1.4:3000',
    'http://192.168.1.108:3000',
    'http://192.168.1.106:3000',
    'http://192.168.1.109:3000',
    'http://172.20.10.2:3000',
];

app.use(express.json()); // allow us to parse incoming request from req.body
app.use(cookieParser()); // allow us to parse incoming cookies

app.use(
    cors({
        origin: (origin, callback) => {
            // allow requests with no origin (mobile apps, curl, Postman)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.warn('Blocked CORS for origin:', origin);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Custom-Header',
            'AccessKey',
        ],
    })
);

app.get('/', (req, res) => {
    return res.json({ message: 'Welcome To My API' });
});

app.use('/api/analysis', statisticRoutes);

app.use('/api/uploads', uploadRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/timetable', timeTableRoutes);

app.use('/api/users', userRoutes);

app.use('/api/homeworks', homeworkRoutes);

app.use('/api/solution', solutionRoutes);

app.use('/api/exam', examRoutes);

app.use('/api/schedule', scheduleRoutes);

app.use('/api/progress', studentProgressRoutes);

app.use('/api/student-videos', studentVideosRoutes);

db.sync({ alter: true })
    .then(() =>
        app.listen(PORT, () =>
            console.log(`🚀 Server is running on port ${PORT}`)
        )
    )
    .catch(err => console.trace(err));
