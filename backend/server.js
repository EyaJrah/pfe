// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Apply Helmet middleware for security headers
app.use(helmet());

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Configure CORS
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL] 
  : ['http://localhost:4200', 'http://127.0.0.1:4200'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('Not allowed by CORS'));
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Middleware for parsing JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection with retry logic
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI environment variable is not set');
    process.exit(1);
  }
  
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Load routes
const userRoutes = require('./routes/userRoutes');
const scanResults = require('./routes/scanResults');

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'API is running...' });
});

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/scan-results', scanResults);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server with port retry logic
const startServer = async (retries = 3) => {
  let currentPort = parseInt(process.env.PORT) || 5000;
  
  for (let i = 0; i < retries; i++) {
    try {
      const server = app.listen(currentPort, () => {
        console.log(`Server is running on port ${currentPort}`);
      });

      // Handle graceful shutdown
      const shutdown = () => {
        server.close(() => {
          console.log('HTTP server closed');
          mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
          });
        });
      };

      process.on('SIGTERM', () => {
        console.log('SIGTERM signal received. Closing HTTP server...');
        shutdown();
      });

      process.on('SIGINT', () => {
        console.log('SIGINT signal received. Closing HTTP server...');
        shutdown();
      });

      return server;
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${currentPort} is in use, trying port ${currentPort + 1}...`);
        currentPort++;
        continue;
      }
      console.error('Error starting server:', error);
      process.exit(1);
    }
  }
  
  console.error(`Could not find an available port after ${retries} attempts`);
  process.exit(1);
};

// Start the server
startServer();