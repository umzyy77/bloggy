import express from 'express';
import blogController from '../controllers/blogController.js';

const router = express.Router();

// Route de base pour tester
router.get('/', (req, res) => 
  res.status(200).json({ message: "Blog API - Version REST" })
);

// Routes RESTful pour les blogs
router.get('/blogs', blogController.getAllBlogs);    
router.get('/blogs/:id', blogController.getBlogById);     
router.post('/blogs', blogController.createBlog);          
router.put('/blogs/:id', blogController.updateBlog);     
router.delete('/blogs/:id', blogController.deleteBlog); 

// Routes pour les commentaires (sous-ressources)
router.get('/blogs/:id/comments', blogController.getCommentsByBlogId);  
router.post('/blogs/:id/comments', blogController.addCommentToBlog);    

export default router;