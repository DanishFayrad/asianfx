import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './models/index.js';

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import signalRoutes from './routes/signalRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/signals', signalRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'node-backend' });
});

// Root
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: "Asian FX API - Node.js Backend",
    version: "2.0.0"
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Sync database
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    // In production, use migrations instead of sync({ alter: true })
    if (process.env.NODE_ENV !== 'production') {
       await sequelize.sync({ alter: { drop: false } });
       console.log('Database synchronized.');
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
  }
};

startServer();
