const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require('../models/User')
const { sendVerification } = require("../middleware/sendVerification");



//////--------------------------------- Register -------------------------------//////////////////
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    // console.log("Request body:", req.body);
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All field required" });
    }
    const existingemail = await User.findOne({ email });
    const existingUser = await User.findOne({ username });
    if (existingemail) {
      return res.status(400).json({ error: "Email already taken" });
    }
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: "Email is not valid" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be atleast 6 characters" });
    }

    const salt = await bcrypt.genSalt(14);
    const hashedPassword = await bcrypt.hash(password, salt);

    // check the first user in the database and set role to admin
    const firstUser = await User.findOne({}).sort({ createdAt: 1 });
    if (!firstUser) {
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        role: "admin",
      });
      await Promise.all([newUser.save()]);

      return res.status(201).json({ message: "User created", user: newUser });
    }
const newUser = new User({
    username,
    email,
    password: hashedPassword
})

await Promise.all([
    newUser.save(),
    sendVerification(newUser)
])

return res.status(201).json({message: "Succefull. Verification link has been sent to your email"})

  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//////--------------------------------- verify email -------------------------------//////////////////
const verifyEmail = async (req, res)=>{
  try {
    const {id} = req.params
  if(!id){
    return res.status(400).json({error: "Invalid link"})
  }
  const existing = await User.findById(id)
  if(!existing){
    return res.status(404).json({error: "User does not exist"})
  }

  if(existing.isVerified){
    return res.status(403).json({error: "User already verified"})
  }

  existing.isVerified = true
  await existing.save()
  return res.status(200).json({message: "User verified successfully"})
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}


//////--------------------------------- Login -------------------------------//////////////////

const login = async (req, res)=>{
 try {
  const {username, password} = req.body
  if(!username || !password){
    return res.status(400).json({error: "All fields required"})
  }
  const existing = await User.findOne({username})
  if(!existing){
    return res.status(404).json({error: "User not found"})
  }

  // if(!existing.isVerified){
  //   return res.status(403).json({error: "Please verify your account"})
  // }
  if(existing.isBlocked){
    return res.status(403).json({error: "Your account is blocked. Contact Admin"})
  }

  const isMatch = await bcrypt.compare(password, existing.password)
  if(!isMatch){
    return res.status(400).json({error: "Invalid password"})
  }

  const token = jwt.sign({id: existing._id}, process.env.JWT_SECRET, {expiresIn: "1h"})
  // existing.password = undefined

  return res.status(200).json({message: "User logging successfully", token: token, user: existing})
 } catch (error) {
  console.error("Error logging in user:", error);
  res.status(500).json({ message: "Internal server error" });
 }

}


//////--------------------------------- Get single user -------------------------------//////////////////

const getUser = async (req, res)=>{
    const {id} = req.params
    const user = await User.findById(id).populate('borrows')
    if(!id){
      return res.status(404).json({error: "User not found"})
    }

    if(id.length < 24){
      return res.status(400).json({error: "Invalid id"})
    }

    return res.status(200).json({message: "User fetched", data: user})
}

//////--------------------------------- Get forget password -------------------------------//////////////////
const forgetPassword = async (req, res)=>{
  const {email} = req.body
  if(!email){
    return res.status(400).json({error: "Email required"})
  }

  const existingEmail = await User.findOne({email})
  if(!existingEmail){
    return res.status(404).json({error: "User not found"})
  }
const transporter = await nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
})

const resetToken = jwt.sign({email: existingEmail}, process.env.JWT_SECRET, {expiresIn: "1h"})

const link = `${process.env.FRONTEND_URL}/user/reset-password?token=${resetToken}`

const mailOptions = {
  from: "Prodigy Book Lab <peforum11@gmail.com>",
  to: email,
  subject: "Password Reset",
  text: 'Click the link below to reset your password',
  html: `<a href="${link}" style="background:#007bff;color:#fff;padding:10px 20px;margin:30px 0;text-decoration:none;border-radius:5px;">Reset Password</a>
  <p>This link will expire in 1 hour</p>
  `
}

await transporter.sendMail(mailOptions)

res.status(200).json({message: "Password reset link has been set to your email"})

}

//////--------------------------------- Reset password -------------------------------//////////////////

const resetPassword = async (req, res)=>{
  const {token} = req.query
  console.log(req.headers);
  
  const {newPassword} = req.body
  if(!token){
    return res.status(400).json({error: "Invalid url"})
  }


  if(!newPassword){
    return res.status(400).json({error: "New password required"})
  }

  if(newPassword.length < 6){
    return res.status(400).json({error: "Password must be at least 6 characters long"})
  }

  let decode;

    try {
      decode = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      return res.status(400).json({error:"Invalid token, pls re-check and try again"})
      
    }
// console.log(decode.email._id);

  const existingUser = await User.findById(decode.email._id)
  if(!existingUser){
    return res.status(404).json({error: "user not found"})
  }

  const salt = await bcrypt.genSalt(14)
  const hashedPassword = await bcrypt.hash(newPassword, salt)


  const ismatch = await bcrypt.compare(newPassword, hashedPassword)
  if(ismatch){
    return res.status(400).json({error: "New password can't be same as old password"})
  }

  existingUser.password = hashedPassword
  await existingUser.save()

  return res.status(200).json({message: "Password changed successfully"})
}

//////--------------------------------- Update Profile -------------------------------//////////////////

const updateProfile = async (req, res)=>{

  try {
    const {_id : userId} = req.user

    if(!userId){
      return res.status(400).json({error: "Your seesion has expired, please login to continue"})
    }

  const updatedUser = await User.findByIdAndUpdate(userId, req.body, {runValidators: true, new: true});
  if(!updatedUser) return res.status(404).json({error: "User not found"})
 return res.status(200).json({message: "Profile updated successfully", updatedUser})
    
  } catch (error) {

    return res.status(500).json({error: "Error updating user" + error.message})
    
  }



}

//////--------------------------------- User Dashboard -------------------------------//////////////////

const userDashboard = async (req, res)=>{
  try {
    const userId = await req.user._id
  if(!userId) return res.status(404).json({error: "User not found"})
    const user = await User.findById(userId).populate('borrows')
  if(!user) return res.status(404).json({error: "user not found"})
  return res.status(200).json({user})
  } catch (error) {
    return res.status(500).json({error: "Error updating user" + error.message})
  }
}



module.exports = {
    register, verifyEmail, login, getUser, forgetPassword, resetPassword, updateProfile, userDashboard
}