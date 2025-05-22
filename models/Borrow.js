const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true
  },
  borrowNote: {
    type: String,
    required: true,
  },
  returnDate: {
    type: Date,
    required: true
  },
  fine: {
    type: Number,
    default: 0
  },
  returned:{
    type: Boolean,
    default: false
  },
  confirmed: {
    type: Boolean,
    default: false
  },
  borrowDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true 
});

const Borrow = mongoose.model('Borrow', borrowSchema);
module.exports = Borrow;
