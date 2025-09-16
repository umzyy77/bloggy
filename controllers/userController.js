import User from '../models/user.js';
import mongoose from 'mongoose';

// GET /users
// je n'ai pas mis les filtre avec regex car pas indiqué 
async function getAllUsers(req, res) {
  try {
    const { sort, ...filters } = req.query;

    let users = await User.find(filters);

    // Calculer le nombre de commentaires pour chaque utilisateur
    if (sort && sort.startsWith("commentsCount")) {
      // récupérer tous les blogs
      const blogs = await Blog.find({}, 'comments');

      const userCommentMap = {};
      users.forEach(u => userCommentMap[u._id] = 0);

      blogs.forEach(blog => {
        blog.comments.forEach(c => {
          if (userCommentMap[c.user]) {
            userCommentMap[c.user]++;
          }
        });
      });

      const multiplier = sort.endsWith("desc") ? -1 : 1;
      users.sort((a, b) => (userCommentMap[a._id] - userCommentMap[b._id]) * multiplier);
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

    const user = new User({ username, email, firstName, lastName });
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

    res.status(200).json({ message: 'User deleted successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
