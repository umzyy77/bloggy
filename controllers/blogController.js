import { Blog, Comment } from '../models/blog.js';
import User from '../models/user.js';
import mongoose from 'mongoose';

// GET /blogs
async function getAllBlogs(req, res) {
  try {
    const { title, authorName, commenterName, startDate, endDate, sort, ...filters } = req.query;

    let query = { ...filters };

    if (title) {
      query.title = { $regex: title, $options: "i" };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (authorName) {
      const regexAuthor = new RegExp(authorName, "i");
      const authors = await User.find({
        $or: [
          { firstName: regexAuthor },
          { lastName: regexAuthor },
          { username: regexAuthor }
        ]
      }).select("_id");
      const authorIds = authors.map(a => a._id);
      query.author = { $in: authorIds };
    }

    if (commenterName) {
      const regexCommenter = new RegExp(commenterName, "i");
      const commenters = await User.find({
        $or: [
          { firstName: regexCommenter },
          { lastName: regexCommenter },
          { username: regexCommenter }
        ]
      }).select("_id");
      const commenterIds = commenters.map(u => u._id);
      
      const commentedBlogs = await Comment.find({
        user: { $in: commenterIds }
      }).distinct('blog');
      
      query._id = { $in: commentedBlogs };
    }

    let blogs = await Blog.find(query)
      .populate('author', 'username email firstName lastName');

    if (sort && (sort.includes('commentsCount') || sort.includes('avgNote'))) {
      for (let blog of blogs) {
        const comments = await Comment.find({ blog: blog._id });
        blog._doc.comments = comments;
      }
    }

    if (sort) {
      const [field, order] = sort.split("_");
      const multiplier = order === "desc" ? -1 : 1;

      if (field === "title") {
        blogs.sort((a, b) => a.title.localeCompare(b.title) * multiplier);
      } else if (field === "createdAt" || field === "updatedAt") {
        blogs.sort((a, b) => (a[field] - b[field]) * multiplier);
      } else if (field === "authorName") {
        blogs.sort((a, b) => {
          const nameA = a.author ? `${a.author.lastName} ${a.author.firstName}` : "";
          const nameB = b.author ? `${b.author.lastName} ${b.author.firstName}` : "";
          return nameA.localeCompare(nameB) * multiplier;
        });
      } else if (field === "commentsCount") {
        blogs.sort((a, b) => {
          const countA = a._doc.comments ? a._doc.comments.length : 0;
          const countB = b._doc.comments ? b._doc.comments.length : 0;
          return (countA - countB) * multiplier;
        });
      } else if (field === "avgNote") {
        blogs.sort((a, b) => {
          const commentsA = a._doc.comments || [];
          const commentsB = b._doc.comments || [];
          
          const avgA = commentsA.length ? 
            commentsA.reduce((sum, c) => sum + (c.note || 0), 0) / commentsA.length : 0;
          const avgB = commentsB.length ? 
            commentsB.reduce((sum, c) => sum + (c.note || 0), 0) / commentsB.length : 0;
          
          return (avgA - avgB) * multiplier;
        });
      }
    }

    res.status(200).json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /blogs/:id
async function getBlogById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username email firstName lastName');

    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    const comments = await Comment.find({ blog: req.params.id })
      .populate('user', 'username firstName lastName')
      .sort({ createdAt: -1 });
    
    const blogWithComments = {
      ...blog._doc,
      comments
    };

    res.status(200).json(blogWithComments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /blogs
async function createBlog(req, res) {
  try {
    const { title, author, content } = req.body;
    if (!title || !author || !content) {
      return res.status(400).json({ error: 'Title, author, and content are required' });
    }

    const authorExists = await User.findById(author);
    if (!authorExists) {
      return res.status(400).json({ error: 'Author not found' });
    }

    const blog = new Blog({
      title,
      author,
      content
    });

    await blog.save();
    
    const populatedBlog = await Blog.findById(blog._id)
      .populate('author', 'username email firstName lastName');

    res.status(201).json(populatedBlog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /blogs/:id
async function updateBlog(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const { title, author, content } = req.body;
    
    if (author) {
      const authorExists = await User.findById(author);
      if (!authorExists) {
        return res.status(400).json({ error: 'Author not found' });
      }
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, author, content },
      { new: true, runValidators: true }
    ).populate('author', 'username email firstName lastName');

    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    res.status(200).json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /blogs/:id
async function deleteBlog(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    await Comment.deleteMany({ blog: req.params.id });

    res.status(200).json({ message: 'Blog deleted successfully', blog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /blogs/:id/comments
async function getCommentsByBlogId(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    const comments = await Comment.find({ blog: req.params.id })
      .populate('user', 'username firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /blogs/:id/comments
async function addCommentToBlog(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const { user, content, note } = req.body;
    if (!user || !content) {
      return res.status(400).json({ error: 'User and content are required' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    const userExists = await User.findById(user);
    if (!userExists) {
      return res.status(400).json({ error: 'User not found' });
    }

    const comment = new Comment({
      blog: req.params.id,
      user,
      content,
      note
    });

    await comment.save();
    
    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'username firstName lastName')
      .populate('blog', 'title');

    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export default {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getCommentsByBlogId,
  addCommentToBlog
};