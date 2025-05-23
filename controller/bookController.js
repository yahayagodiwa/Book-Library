const Book = require("../models/Book");
const User = require("../models/User");
const Review = require("../models/review");

const cloudinary = require("../utils/cloudinary");
const streamifier = require("streamifier");
const Borrow = require("../models/Borrow");
const redis = require("../utils/redisClient");


//////--------------------------------- Cloudinary -------------------------------//////////////////

const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "Book",
        width: 500,
        crop: "scale",
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload failed:", error);
          reject(error);
        } else {
          console.log("✅ Cloudinary upload success:", result.secure_url);
          resolve(result);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

//////--------------------------------- Create book record -------------------------------//////////////////
//////--------------------------------- Create book record -------------------------------//////////////////

const recordBook = async (req, res) => {
  try {
    const { title, description, fineAmount } = req.body;

    // Validation
    if (!title || !description || !fineAmount) {
      return res.status(400).json({ error: "All fields required" });
    }
    if (title.length < 6) {
      return res
        .status(400)
        .json({ error: "Title must be at least 6 characters long" });
    }

    const existingBook = await Book.findOne({ title });
    if (existingBook) {
      return res.status(400).json({ error: "Book already exists" });
    }

    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: "Book cover required" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    const fileSizeLimit = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Invalid image type" });
    }
    if (file.size > fileSizeLimit) {
      return res.status(400).json({ error: "Image size exceeds limit" });
    }

    // Upload to Cloudinary
    const result = await streamUpload(file.buffer);

    // Create and save book
    const newBook = new Book({
      title,
      description,
      bookCover: result.secure_url,
      fineAmount,
      category: req.body.category,
      author: req.user._id,
    });

    await newBook.save();

    const user = await User.findById(req.user._id);
    user.books.push(newBook);
    await user.save();
    await redis.del("allBooks");

    return res.status(201).json({
      message: "Book recorded successfully",
      book: newBook,
      user,
    });
  } catch (error) {
    console.error("🔥 Error saving book:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

//////--------------------------------- Get All book -------------------------------//////////////////

const allBook = async (req, res) => {
  try {
    // const cachedBooks = await redis.get("allBooks");

    // if (cachedBooks) {
    //   return res.status(200).json({
    //     message: "Books fetched from cache",
    //     books: JSON.parse(cachedBooks),
    //   });
    // }

    const books = await Book.find().sort({createdAt: -1}).populate("author", "username"); 
    await redis.set("allBooks", JSON.stringify(books), "EX", 3600);

    return res.status(200).json({ message: "Books fetched from database", books });
  } catch (error) {
    console.error("🔥 Error fetching books:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};


const allBooksByCategories = async (req, res) => {
  const { category } = req.query;
  try {
    const cachedBooks = await redis.get(`allBooksBy${category}`);

    if (cachedBooks) {
      const books = JSON.parse(cachedBooks);

      if (books.length === 0) {
        return res.status(404).json({
          error: `No books found for the ${category} category!`
        });
      }

      return res.status(200).json({
        message: "Books fetched from cache",
        books,
      });
    }

    const books = await Book.find({ category });

    if (books.length === 0) {
      return res.status(404).json({
        message: `No books found for the ${category} category!`
      });
    }

    await redis.set(`allBooksBy${category}`, JSON.stringify(books), "EX", 3600); // 1 hour cache
    return res.status(200).json({
      message: "Books fetched from database",
      books,
    });

  } catch (error) {
    console.error("🔥 Error fetching books:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};


//////--------------------------------- Get singl book -------------------------------//////////////////
const singleBook = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.length !== 24) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const book = await Book.findById(id).populate({
    path: "reviews",
    populate: {
      path: "reviewAuthor",
      select: "username"
    }
  })
  .populate({
    path: "author",
    select: "username"
  })

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    return res.status(200).json({ message: "Book fetched", book });
  } catch (error) {
    console.error("🔥 Error saving book:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

//////--------------------------------- Borrow book -------------------------------//////////////////
const borrowBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { borrowNote, returnDate } = req.body;
    if (!id || id.length !== 24) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    if (!borrowNote || !returnDate) {
      return res.status(400).json({ error: "All fields required" });
    }
    const book = await Book.findById(id);
    const borrowBook = await Borrow.findById(id);
    if (borrowBook)
      return res
        .status(400)
        .json({ error: "You have already borrowed this book" });

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    const borrowed = await Borrow.findOne({ book });
    if (borrowed)
      return res
        .status(400)
        .json({ error: "you have already borrowed this book" });

    const newBorrow = new Borrow({
      book: id,
      borrowNote,
      returnDate,
      fine: book.fineAmount,
    });
    await newBorrow.save();

    const user = await User.findById(req.user._id);
    user.borrows.push(newBorrow._id);
    await user.save();

    return res
      .status(201)
      .json({ message: "Book borrowed successfully", borrow: newBorrow });
  } catch (error) {
    console.error(" Error saving book:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

//////--------------------------------- Returnbook -------------------------------//////////////////

const returnBook = async (req, res) => {
  const { borrowId } = req.params;
  // console.log(req.params);
  // const user = await User.findById(req.user._id); // assuming `req.user` is set via auth middleware
// await Borrow.updateMany(
//   { user: { $exists: false } },
//   { $set: { user: user._id } }
// );
  
  const borrow = await Borrow.findById(borrowId).populate("book").populate('user', "username email");
  // console.log(borrow);

  if (!borrow)
    return res.status(404).json({ error: "Borrow record not found" });

  if (borrow.returned) {
    return res.status(400).json({ error: "Book already returned" });
  }

  const now = new Date();
  const returnDate = new Date(borrow.returnDate);
  if (now > returnDate) {
    const user = await User.findById(req.user._id);
    await user.populate("borrows");
    // console.log(user);

    user.fine += borrow.fine;
    await user.save();
  }
  borrow.returned = true;
  await borrow.save();
};


//////---------------------------------Get Returned book -------------------------------//////////////////

const returnedBooks = async (req, res) => {
  try {
    // const user = req.user._id
    const borrows = await Borrow.find({ returned: true }).populate('book').populate('user', "username email")
    console.log(borrows);
    
    if (!borrows || borrows.length === 0) {
      return res.status(404).json({ message: 'No returned books found' });
    }
    res.status(200).json({ books: borrows });
  } catch (error) {
    console.error('Error fetching returned books:', error);
    res.status(500).json({ error: 'Server error while fetching returned books' });
  }
};

//////---------------------------------Get Returned book -------------------------------//////////////////

const confirmReturns = async (req, res)=>{
  const {id} = await req.params
  const book = await Borrow.findById(id)
  if(!book){
    return res.status(404).json({error: "Book not found"})
  }
  console.log(book);
   book.confirmed = true
   await book.save()

   return res.status(200).json({message: "Book return Confirmed"})
  
}

//////--------------------------------- Review Book -------------------------------//////////////////

const reviewBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { comment, rating } = req.body;

    if (!comment || !rating) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (rating > 5 || rating < 1) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const book = await Book.findById(bookId);
    // console.log(book);
    
    if (!book) {
      return res.status(403).json({ error: "Book not found" });
    }

    const hasReviewed = await Review.findOne({
      book: bookId,
      reviewAuthor: req.user._id,
    });
// console.log(hasReviewed);

    if (hasReviewed) {
      return res
        .status(400)
        .json({ error: "You have arleady review this book" });
    }

    const newReview = new Review({
      comment,
      rating,
      reviewAuthor: req.user._id,
      book,
    });
    await newReview.save();

    book.reviews.push(newReview._id);
    await book.save();

    return res
      .status(200)
      .json({ message: "Review submitted successfully", newReview });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

//////--------------------------------- like Book -------------------------------//////////////////

const likeBook = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user._id.toString(); // Ensure it's a string

    const book = await Book.findById(id);

    if (!book) return res.status(404).json({ error: "Book not found" });

    const likedIndex = book.likedBy.findIndex(
      (uid) => uid.toString() === userId
    );

    if (likedIndex !== -1) {
      // User already liked the book — Unlike it
      book.likes -= 1;
      book.likedBy.splice(likedIndex, 1);
      await book.save();
      return res.status(200).json({ message: "Book unliked" });
    } else {
      // Like it
      book.likes += 1;
      book.likedBy.push(userId);
      await book.save();
      return res.status(200).json({ message: "Book liked" });
    }
  } catch (error) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

//////--------------------------------- Update Book -------------------------------//////////////////
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book) return res.status(404).json({ error: "Book not found" });
    const updatedBook = await Book.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    await redis.del("allBooks");

    return res
      .status(200)
      .json({ message: "Book updated successfully", updatedBook });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
};

//////--------------------------------- Delete Book -------------------------------//////////////////
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    await Book.findOneAndDelete(id);
    await redis.del("allBooks");

    return res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = {
  recordBook,
  allBook,
  singleBook,
  borrowBook,
  returnBook,
  reviewBook,
  likeBook,
  updateBook,
  deleteBook,
  allBooksByCategories,
  returnedBooks,
  confirmReturns
};
