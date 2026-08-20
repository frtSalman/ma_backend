import express from 'express';
import {
    signup,
    studentSignup,
    verifyEmail,
    logout,
    login,
    forgotPassword,
    resetPassword,
    checkAuth,
    sendStudentInvitation,
    sendParentInvitation,
    updateAccount,
    parentSignup,
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { verifyCsrfToken } from '../middlewares/verifyCsrfToken.js';

const router = express.Router();

router.get('/check-auth', verifyToken, checkAuth);

router.post('/signup', signup);

router.post('/student-signup/:token', studentSignup);

router.post('/parent-signup/:token', parentSignup);

//router.post('/teacher-signup/:token', teacherSignup);

router.post(
    '/send-student-invitation',
    verifyToken,
    verifyCsrfToken,
    sendStudentInvitation
);

router.post(
    '/send-parent-invitation',
    verifyToken,
    verifyCsrfToken,
    sendParentInvitation
);

//router.post('/send-teacher-invitation', verifyToken, sendTeacherInvitation);

router.post('/verify-email', verifyEmail);

router.post('/login', verifyCsrfToken, login);

router.post('/logout', verifyToken, verifyCsrfToken, logout);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password/:token', resetPassword);

router.put('/account-update', verifyToken, verifyCsrfToken, updateAccount);

export default router;
