import express from 'express';
import userController from '../controllers/userController.js';

const router = express.Router();

// Routes RESTful pour les utilisateurs
router.get('/users', userController.getAllUsers); 
router.get('/users/:id', userController.getUserById);
router.post('/users', userController.createUser);         
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

// Routes pour les sous-ressources des utilisateurs
router.get('/users/:id/comments', userController.getCommentsByUser);
router.get('/users/:id/blogs', userController.getBlogsByUser);

export default router;