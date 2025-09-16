import mongoose from 'mongoose'; // importer la lib Mongoose
import dotenv from 'dotenv';
dotenv.config(); // importer les variables d'environnement (notamment le .env)


const mongoURI = process.env.MONGO_URI; // récupérer l'URI depuis les variables d'environnement

// On exporte la fonction `connectDB` de façon à pouvoir l'utiliser facilement dans d'autres fichiers
async function connectDB() {
    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection failed');
        console.error(error);
    }
};

export default connectDB;