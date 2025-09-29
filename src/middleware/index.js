const Logger = require('../utils/Logger');

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  Logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    requestId: req.id,
    ip: req.ip || req.connection.remoteAddress
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.id
    });
  });

  next();
};

/**
 * Error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  Logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    requestId: req.id
  });

  if (!res.headersSent) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Internal server error',
      requestId: req.id,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  next();
};

/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
  // Add basic request validation
  if (req.method === 'POST' && !req.body) {
    return res.status(400).json({
      status: 'error',
      message: 'Request body is required',
      requestId: req.id
    });
  }

  next();
};

module.exports = {
  requestLogger,
  errorHandler,
  validateRequest
};