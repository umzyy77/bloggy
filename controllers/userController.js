import User from '../models/user.js';
import { Blog, Comment } from '../models/blog.js';
import mongoose from 'mongoose';

// GET /users
async function getAllUsers(req, res) {
  try {
    const { sort, ...filters } = req.query;
    
    let users = await User.find(filters);

    if (sort) {
      const [field, order] = sort.split("_");
      const multiplier = order === "desc" ? -1 : 1;

      if (field === "username") {
        users.sort((a, b) => a.username.localeCompare(b.username) * multiplier);
      } else if (field === "createdAt") {
        users.sort((a, b) => (a.createdAt - b.createdAt) * multiplier);
      } else if (field === "commentsCount") {
        const userCommentCounts = await Comment.aggregate([
          { $group: { _id: "$user", count: { $sum: 1 } } }
        ]);
        
        const userCommentMap = {};
        users.forEach(u => userCommentMap[u._id.toString()] = 0);
        userCommentCounts.forEach(item => {
          if (item._id && userCommentMap[item._id.toString()] !== undefined) {
            userCommentMap[item._id.toString()] = item.count;
          }
        });
        
        users.sort((a, b) => (userCommentMap[a._id.toString()] - userCommentMap[b._id.toString()]) * multiplier);
      }
    }

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /users/:id
async function getUserById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /users
async function createUser(req, res) {
  try {
    const { username, email, firstName, lastName } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    const user = new User({ 
      username, 
      email, 
      firstName, 
      lastName 
    });

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

// PUT /users/:id
async function updateUser(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const { username, email, firstName, lastName } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, firstName, lastName },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

// DELETE /users/:id 
async function deleteUser(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Optionnel: Supprimer aussi les blogs et commentaires de cet utilisateur
    await Blog.deleteMany({ author: req.params.id });
    await Comment.deleteMany({ user: req.params.id });

    res.status(200).json({ 
      message: 'User deleted successfully', 
      user 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /users/:id/comments
async function getCommentsByUser(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const comments = await Comment.find({ user: req.params.id })
      .populate('blog', 'title author')
      .populate('user', 'username firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /users/:id/blogs
async function getBlogsByUser(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const blogs = await Blog.find({ author: req.params.id })
      .populate('author', 'username firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getCommentsByUser,
  getBlogsByUser
};