const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role:{
        type: String,
        enum: ['user', "staff", "admin"],
        default: "user"
    },
    fine:{
        type: Number,
        default: 0
    },
    isVerified:{
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    books:[{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book"
        }],
    borrows: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Borrow"
    }]
}, {timestamps: true})

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User