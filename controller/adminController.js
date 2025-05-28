const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Book = require("../models/Book");
const Borrow = require("../models/Borrow");

///////////////// --------------------------- Login ------------------------ /////////////////////////
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existing = await User.findOne({ username });
    if (!existing) {
      return res.status(404).json({ error: "Incorrect username" });
    }

    if (existing.role !== "admin") {
      return res
        .status(400)
        .json({ error: "You are not authorized to use this route" });
    }

    if (!existing.isVerified) {
      return res.status(403).json({ error: "Please verify your account" });
    }

    if (existing.isBlocked) {
      return res
        .status(403)
        .json({ error: "Your account is blocked. Contact Admin" });
    }

    const isMatch = await bcrypt.compare(password, existing.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign({ id: existing._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      message: "Admin login successful",
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

///////////////// --------------------------- Admin Dashboard ------------------------ /////////////////////////
const adminDashboard = async (req, res) => {
  try {
    const userId = await req.user._id;
    const admin = await User.findById(userId).populate("books");

    return res.status(200).json({ message: "Admin dashboard fetched", admin });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
};

///////////////// --------------------------- Edit Book ------------------------ /////////////////////////
const editBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    const updateData = {
      ...req.body,
    };

    if (req.file) {
      updateData.bookCover = `/uploads/book-covers/${req.file.filename}`;
    }

    const book = await Book.findByIdAndUpdate(bookId, updateData, {
      runValidators: true,
      new: true,
    });

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    return res.status(200).json({ message: "Book updated successfully", book });
  } catch (error) {
    console.error("Error editing book:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

///////////////// --------------------------- Delete Book ------------------------ /////////////////////////
const deleteBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findByIdAndDelete(bookId);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    return res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


//////////////------------------- get all borrowed books .......................////////////////////
const getBorrowed = async (req, res)=>{
  try {
    const books = await Borrow.find({returned: false}).populate('book', "title").populate('user', "username")
    return res.status(200).json(books)
  } catch (error) {
    console.error("Error deleting book:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  adminLogin,
  adminDashboard,
  editBook,
    deleteBook,
    getBorrowed
};
