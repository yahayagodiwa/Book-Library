const express = require('express')
const { register, verifyEmail, login, getUser, forgetPassword, resetPassword, updateProfile, userDashboard } = require('../controller/authController')
const { authMiddleware } = require('../middleware/authentication')


const router = express.Router()



router.post('/register', register)
router.get('/verify-email/:id', verifyEmail)
router.post('/login', login)
router.get('/single-user/:id', getUser)
router.post('/forget-password', forgetPassword)
router.post('/reset-password', resetPassword)
router.patch('/update-profile', authMiddleware, updateProfile)
router.get('/dashboard', authMiddleware, userDashboard)



module.exports = router