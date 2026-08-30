import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { globalErrorHandler } from './app/middlewares/globalErrorHandler';
import { IndexRoutes } from './app/routes';

const app: Application = express();

// Security & Parsing Middlewares
app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      process.env.FRONTEND_URL || 'http://localhost:3000',
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Health Check Endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: '⚡ RBAC Tutorial Express Server is running smoothly!',
    version: '1.0.0',
  });
});

// API Routes Mounting (Support both /api/v1 and legacy /api paths)
app.use('/api/v1', IndexRoutes);
app.use('/api', IndexRoutes);

// 404 Route Not Found Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Cannot ${req.method} ${req.originalUrl} — Route Not Found`,
  });
});

// Global Error Handler Middleware
app.use(globalErrorHandler);

export default app;
