import mongoose from "mongoose";
const { Schema, model } = mongoose;

const blogSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long'],
    maxlength: [200, 'Title must be less than 200 characters long']
  },
  author: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    minlength: [10, 'Content must be at least 10 characters long']
  }
}, {
  timestamps: true
});

const commentSchema = new Schema({
  blog: {
    type: mongoose.Types.ObjectId,
    ref: 'Blog',
    required: [true, 'Blog reference is required']
  },
  user: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    minlength: [1, 'Comment cannot be empty'],
    maxlength: [500, 'Comment must be less than 500 characters long']
  },
  note: {
    type: Number,
    min: [1, 'Note must be at least 1'],
    max: [5, 'Note must be at most 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Note must be an integer'
    }
  }
}, {
  timestamps: true
});

blogSchema.index({ title: 'text', content: 'text' });
blogSchema.index({ author: 1, createdAt: -1 });

commentSchema.index({ blog: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 });

const Blog = model('Blog', blogSchema);
const Comment = model('Comment', commentSchema);

export { Blog, Comment };