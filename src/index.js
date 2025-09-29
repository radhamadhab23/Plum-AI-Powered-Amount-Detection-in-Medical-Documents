const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Logger = require('./utils/Logger');

// Import routes
const apiRoutes = require('./routes/index');

const app = express();
// Base port preference; we'll probe and increment if in use
const BASE_PORT = parseInt(process.env.PORT, 10) || 3100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Legacy routes (redirect to /api)
app.get('/', (req, res) => res.redirect('/api'));
app.get('/health', (req, res) => res.redirect('/api/health'));
app.post('/detect-amounts-text', (req, res) => res.redirect(307, '/api/detect-amounts-text'));
app.post('/detect-amounts-image', (req, res) => res.redirect(307, '/api/detect-amounts-image'));

// Error handling middleware
app.use((error, req, res, next) => {
  Logger.error('Unhandled error:', { error: error.message, stack: error.stack, requestId: req.id });
  if (!res.headersSent) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      requestId: req.id
    });
  }
  next();
});

// 404 handler
app.use('*', (req, res) => {
  Logger.warn('404 - Endpoint not found', { path: req.originalUrl, method: req.method, requestId: req.id });
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.originalUrl,
    requestId: req.id
  });
});

// Helper to attempt listening on an available port
function startServer(port, attempt = 0) {
  const server = app.listen(port, () => {
    Logger.info(`🚀 Amount Detection Service running on port ${port}`);
    Logger.info(`📖 API Documentation available at http://localhost:${port}/api`);
    console.log(`🚀 Amount Detection Service running on port ${port}`);
    console.log(`📖 API Documentation available at http://localhost:${port}/api`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 10) {
      const nextPort = port + 1;
      Logger.warn(`Port ${port} in use, trying ${nextPort}`);
      setTimeout(() => startServer(nextPort, attempt + 1), 200);
    } else {
      Logger.error('Failed to bind server port', { error: err.message, code: err.code });
      process.exit(1);
    }
  });
}

startServer(BASE_PORT);

module.exports = app;
