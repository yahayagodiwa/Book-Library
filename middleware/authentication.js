const jwt = require('jsonwebtoken')
const User = require("../models/User");

const authMiddleware = async (req, res, next)=>{
try {
    
    let token = req.headers['authorization']

    if(!token || !token.startsWith('Bearer')){
        return res.status(400).json({error: "Please login"})
    }

    token = token.split(" ")[1]

    try {

        const decode =  jwt.verify(token, process.env.JWT_SECRET)

        const user = await User.findById(decode.id)

        if(!user){
            return res.status(404).json({error: "User not found"})
        }

        if(decode.exp < Date.now() / 1000){
            return res.status(401).json({error: "Please login again"})
        }
        
        req.user = user
        req.token = token
        next()
    } catch (error) {
        return res.status(500).json({error: "Please login"})
        
    }

} catch (error) {
    return res.status(500).json({error: "Please login" + error.message})
}
}

//////--------------------------------- Staff Auth -------------------------------//////////////////

const staffAuth = async (req, res, next)=>{
    try {

        if(req.user.role !== "staff" || req.user.role !== "admin"){
            return res.status(403).json({error: "You are not allowed"})
        }

        next()
        
    } catch (error) {
        return res.status(500).json({error: "Please login to perform the action" + error.message})
    }

}

//////--------------------------------- Admin Auth -------------------------------//////////////////

const adminAuth = async (req, res, next)=>{

    try {
    if(req.user.role !== "admin"){
        return res.status(403).json({error: "You are not admin"})
    }
        next()
    } catch (error) {
        return res.status(500).json({error: "error occured authenticating Admin" + error.message}) 
    }
}




module.exports = {
    authMiddleware, staffAuth, adminAuth
}