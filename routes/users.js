import express from 'express';
import userController from '../controllers/userController.js';

const router = express.Router();

// Routes RESTful pour les utilisateurs
router.get('/users', userController.getAllUsers);        // GET tous les utilisateurs
router.get('/users/:id', userController.getUserById);    // GET un utilisateur par ID
router.post('/users', userController.createUser);        // POST créer un utilisateur
router.put('/users/:id', userController.updateUser);     // PUT modifier un utilisateur
router.delete('/users/:id', userController.deleteUser);  // DELETE supprimer un utilisateur

export default router;