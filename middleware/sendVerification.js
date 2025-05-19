const nodemailer = require('nodemailer')

const sendVerification = async (user)=>{
try {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    })

    const mailOptions = {
        from: "Prodigy Lab <peforum11@gmail.com>",
        to: user.email,
        subject: "Verify Your Email",
        text: `Click the link to verify your email: ${process.env.FRONTEND_URL}/user/verify-email/${user._id}`
    }
    await transporter.sendMail(mailOptions)
} catch (error) {
    console.log(error);
    
    
}
}

module.exports = {sendVerification}