import express from 'express';
import blogController from '../controllers/blogController.js';

const router = express.Router();

// Route de base pour tester
router.get('/', (req, res) => 
  res.status(200).json({ message: "Blog API - Version REST" })
);

// Routes RESTful pour les blogs
router.get('/blogs', blogController.getAllBlogs);        // GET tous les articles
router.get('/blogs/:id', blogController.getBlogById);    // GET un article par ID
router.post('/blogs', blogController.createBlog);        // POST créer un article
router.put('/blogs/:id', blogController.updateBlog);     // PUT modifier un article
router.delete('/blogs/:id', blogController.deleteBlog);  // DELETE supprimer un article


router.get('/blogs/:id/comments', blogController.getCommentsByBlogId);    // GET commentaires d'un article
router.post('/blogs/:id/comments', blogController.addCommentToBlog);      // POST ajouter un commentaire

// Anciennes routes (commentées pour référence)
/*
router.get('/blogs/new', blogController.createBlog);     // Ancienne route GET
router.get('/blogs/author/:author', blogController.getBlogsByAuthor); // Route par auteur
*/

export default router;