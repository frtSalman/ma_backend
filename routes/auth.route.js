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
    sendTeacherInvitation,
    teacherSignup,
    parentSignup,
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.get('/check-auth', verifyToken, checkAuth);

router.post('/signup', signup);

router.post('/student-signup/:token', studentSignup);

router.post('/parent-signup/:token', parentSignup);

router.post('/teacher-signup/:token', teacherSignup);

router.post('/send-student-invitation', sendStudentInvitation);

router.post('/send-parent-invitation', sendParentInvitation);

router.post('/send-teacher-invitation', sendTeacherInvitation);

router.post('/verify-email', verifyEmail);

router.post('/login', login);

router.post('/logout', logout);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password/:token', resetPassword);

router.put('/account-update', updateAccount);

export default router;
