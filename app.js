import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import db from './utils/database.js';
import { removeLegacyStudentVideoIndexes } from './utils/removeLegacyStudentVideoIndexes.js';
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
import paymentRoutes from './routes/payment.route.js';
import subscriptionRoutes from './routes/subscriptions.route.js';
import { generateTokenAndSetCookie } from './utils/generateTokenAndSetCookie.js';
import { generateCSRFToken } from './utils/generateCSRFToken.js';
import { verifyToken } from './middlewares/verifyToken.js';

dotenv.config();
const app = express();
const PORT = 5000;

const allowedOrigins = [
    'https://app.teachflow.net',
    'https://api.teachflow.net',
    'http://192.168.1.104:3000',
    'http://localhost:3000',
    'https://n8n.teachflow.net:5678',
];

const allowedPaymentCallbackOrigins = [
    'https://sandbox-api.iyzipay.com',
    'https://api.iyzipay.com',
];

app.use(express.json()); // allow us to parse incoming request from req.body
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // allow us to parse incoming cookies

app.use(
    cors((req, callback) => {
        const is3DSCallback = req.path === '/api/payment/3ds-callback';

        callback(null, {
            origin: (origin, done) => {
                if (!origin || (is3DSCallback && origin === 'null')) {
                    return done(null, true);
                }

                if (
                    is3DSCallback &&
                    allowedPaymentCallbackOrigins.includes(origin)
                ) {
                    return done(null, true);
                }

                if (allowedOrigins.includes(origin)) {
                    return done(null, true);
                }

                console.warn('Blocked CORS for origin:', origin);
                return done(new Error('Not allowed by CORS'));
            },
            credentials: true,
            methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Custom-Header',
                'AccessKey',
                'X-CSRF-Token',
                'X-XSRF-TOKEN',
            ],
        });
    })
);

/* app.use(
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
            'X-CSRF-Token',
            'X-XSRF-TOKEN',
        ],
    })
); */

app.get('/api/csrf-token', async (req, res) => {
    const csrfToken = generateCSRFToken(res);
    res.json({
        message: 'CSRF token set in cookies',
        csrfToken,
    });
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

app.use('/api/payment', paymentRoutes);

app.use('/api/subscription', subscriptionRoutes);

db.sync({ alter: true })
    .then(() => removeLegacyStudentVideoIndexes(db))
    .then(() => {
        return app.listen(PORT, () =>
            console.log(`🚀 Server is running on port ${PORT}`)
        );
    })
    .catch(err => console.trace(err));
