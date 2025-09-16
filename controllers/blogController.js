import Blog from '../models/blog.js';
import User from '../models/user.js';
import mongoose from 'mongoose';

// GET /blogs - Afficher tous les articles
async function getAllBlogs(req, res) {
  try {
    const { title, authorName, commenterName, startDate, endDate, sort, ...filters } = req.query;

    // Initialisation du filtre MongoDB
    let query = { ...filters };

    // Recherche partielle sur le titre
    if (title) {
      query.title = { $regex: title, $options: "i" };
    }

    // Filtre sur la date de création
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Filtre sur l'auteur
    let authorIds = null;
    if (authorName) {
      const regexAuthor = new RegExp(authorName, "i");
      const authors = await User.find({
        $or: [
          { firstName: regexAuthor },
          { lastName: regexAuthor },
          { username: regexAuthor }
        ]
      }).select("_id");
      authorIds = authors.map(a => a._id);
      query.author = { $in: authorIds };
    }

    // Récupération des blogs avec population
    let blogs = await Blog.find(query)
      .populate('author', 'username email firstName lastName')
      .populate('comments.user', 'username firstName lastName');

    // Filtre sur les commentateurs
    if (commenterName) {
      const regexCommenter = new RegExp(commenterName, "i");
      blogs = blogs.filter(blog =>
        blog.comments.some(
          c => c.user && (regexCommenter.test(c.user.firstName) || regexCommenter.test(c.user.lastName) || regexCommenter.test(c.user.username))
        )
      );
    }

    // Tri
    if (sort) {
      const [field, order] = sort.split("_");
      const multiplier = order === "desc" ? -1 : 1;

      if (field === "authorName") {
        blogs.sort((a, b) => {
          const nameA = a.author ? a.author.lastName + a.author.firstName : "";
          const nameB = b.author ? b.author.lastName + b.author.firstName : "";
          return nameA.localeCompare(nameB) * multiplier;
        });
      } else if (["title", "createdAt", "updatedAt"].includes(field)) {
        blogs.sort((a, b) => {
          if (!a[field]) return 1;
          if (!b[field]) return -1;
          if (a[field] instanceof Date) {
            return (a[field] - b[field]) * multiplier;
          }
          return a[field].localeCompare(b[field]) * multiplier;
        });
      } else if (field === "commentsCount") {
        blogs.sort((a, b) => (a.comments.length - b.comments.length) * multiplier);
      } else if (field === "avgNote") {
        blogs.sort((a, b) => {
          const avgA = a.comments.length ? a.comments.reduce((sum, c) => sum + (c.note || 0), 0) / a.comments.length : 0;
          const avgB = b.comments.length ? b.comments.reduce((sum, c) => sum + (c.note || 0), 0) / b.comments.length : 0;
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
      .populate('author', 'username email firstName lastName')
      .populate('comments.user', 'username firstName lastName');

    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    res.status(200).json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// POST /blogs
async function createBlog(req, res) {
  try {
    const { title, author, content, comments } = req.body;
    if (!title || !author || !content) {
      return res.status(400).json({ error: 'Title, author, and content are required' });
    }

    const blog = new Blog({
      title,
      author,
      content,
      comments: comments || []
    });

    await blog.save();
    res.status(201).json(blog);
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

    const { title, author, content, comments } = req.body;
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, author, content, comments },
      { new: true, runValidators: true }
    );

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

    const blog = await Blog.findById(req.params.id)
      .populate('comments.user', 'username firstName lastName');

    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    res.status(200).json(blog.comments);
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
    if (note && (note < 1 || note > 5)) {
      return res.status(400).json({ error: 'Note must be between 1 and 5' });
    }

    const newComment = { user, content, note: note || null };
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: newComment } },
      { new: true }
    ).populate('comments.user', 'username firstName lastName');

    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    const addedComment = blog.comments[blog.comments.length - 1];
    res.status(201).json(addedComment);
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
