const express = require('express')
const { authMiddleware, adminAuth } = require('../middleware/authentication')
const upload = require('../middleware/multer')
const { recordBook } = require('../controller/bookController')
const { adminLogin, adminDashboard, editBook, deleteBook } = require('../controller/adminController')


const router = express.Router()


router.post('/login', adminLogin)
router.post('/record', authMiddleware, adminAuth, upload.single('bookCover'), recordBook)
router.get('/dashboard', authMiddleware, adminDashboard)
router.patch('/update-book/:bookId', authMiddleware, adminAuth, upload.single("bookCover"), editBook)
router.patch('/delete-book/:bookId', authMiddleware, adminAuth, deleteBook)


module.exports = router