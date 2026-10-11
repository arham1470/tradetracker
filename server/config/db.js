import mongoose from 'mongoose';

/**
 * Connects to MongoDB using the MONGODB_URI environment variable.
 * Exits the process with a clear message if the connection cannot be made.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('✖ MONGODB_URI is not defined. Copy server/.env.example to server/.env and set MONGODB_URI.');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`✔ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error(`✖ MongoDB connection failed: ${err.message}`);
    console.error('   Is MongoDB running locally, or is the connection string correct?');
    process.exit(1);
  }
}