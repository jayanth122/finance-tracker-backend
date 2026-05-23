require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const { getHealthStatus } = require('./services/healthService');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5000;
const jsonLimit = process.env.JSON_LIMIT || '1mb';
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 300;
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const keepAliveIntervalMs = Number(process.env.KEEP_ALIVE_INTERVAL_MS) || 5 * 60 * 1000; // Default: 5 minutes

app.disable('x-powered-by');

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const corsError = new Error('CORS origin denied.');
    corsError.status = 403;
    return callback(corsError);
  },
  credentials: true,
}));
app.use(rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/health', async (req, res) => {
  try {
    const health = await getHealthStatus();
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Failed to check health status',
    });
  }
});

// Keep-alive endpoint to maintain Supabase connection
app.get('/api/keep-alive', async (req, res) => {
  try {
    const health = await getHealthStatus();
    res.status(200).json({
      message: 'Connection kept alive',
      ...health,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Keep-alive check failed',
      error: err.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const exposeError = !isProduction || status < 500;

  if (!isProduction) {
    console.error(err);
  }

  return res.status(status).json({
    error: exposeError ? err.message : 'Internal server error.',
  });
});

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Keep-alive interval: ${keepAliveIntervalMs}ms`);
});

// Set up keep-alive interval to maintain Supabase connection
let keepAliveInterval;
const startKeepAlive = async () => {
  keepAliveInterval = setInterval(async () => {
    try {
      await getHealthStatus();
      if (!isProduction) {
        console.log('[Keep-Alive] Supabase connection check completed');
      }
    } catch (err) {
      console.error('[Keep-Alive] Failed to check connection:', err.message);
    }
  }, keepAliveIntervalMs);
};

startKeepAlive();

const shutdown = (signal) => {
  console.log(`Received ${signal}. Closing server...`);
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});
