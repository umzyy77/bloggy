import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/blogs.js';
import userRoutes from './routes/users.js';
import connectDB from './config/db.js';

dotenv.config();
const PORT = process.env.PORT;
const app = express();

connectDB();
app.use(express.json());
app.use('', routes);
app.use('', userRoutes);

app.listen(PORT, () =>
  console.log("App started on port " + PORT)
);