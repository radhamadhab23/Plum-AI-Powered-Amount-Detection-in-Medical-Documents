const AmountDetectionService = require('../services/AmountDetectionService');
const AmountDetectionRequest = require('../models/AmountDetectionRequest');
const AmountDetectionResponse = require('../models/AmountDetectionResponse');
const ValidationUtils = require('../utils/ValidationUtils');
const Logger = require('../utils/Logger');

/**
 * Amount Detection Controller
 * Handles HTTP requests and responses for amount detection
 */
class AmountDetectionController {
  constructor() {
    this.amountDetectionService = new AmountDetectionService();
  }

  /**
   * Get API information
   */
  async getApiInfo(req, res) {
    try {
      res.json({
        message: 'AI-Powered Amount Detection Service',
        version: '1.0.0',
        endpoints: {
          'POST /api/detect-amounts-text': 'Process text input for amount detection',
          'POST /api/detect-amounts-image': 'Process image input with OCR for amount detection',
          'GET /api/health': 'Health check endpoint'
        },
        documentation: 'https://github.com/your-repo/ai-amount-detection'
      });
    } catch (error) {
      Logger.error('Error in getApiInfo:', error);
      res.status(500).json(AmountDetectionResponse.error('Internal server error').toJSON());
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req, res) {
    try {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'AI Amount Detection Service'
      });
    } catch (error) {
      Logger.error('Error in healthCheck:', error);
      res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
  }

  /**
   * Process text input for amount detection
   */
  async detectAmountsFromText(req, res) {
    const startTime = Date.now();

    try {
      // Validate request
      const textValidation = ValidationUtils.validateTextInput(req.body.text);
      if (!textValidation.isValid) {
        return res.status(400).json(
          AmountDetectionResponse.error('Invalid input', textValidation.error).toJSON()
        );
      }

      // Create request model
      const request = new AmountDetectionRequest({
        text: ValidationUtils.sanitizeText(req.body.text),
        options: req.body.options || {}
      });

      // Validate request model
      const requestValidation = request.validate();
      if (!requestValidation.isValid) {
        return res.status(400).json(
          AmountDetectionResponse.error('Validation failed', requestValidation.errors).toJSON()
        );
      }

      Logger.info('Processing text input for amount detection', {
        textLength: request.text.length,
        requestId: req.headers['x-request-id'] || 'unknown'
      });

      // Process request
      const result = await this.amountDetectionService.processText(request.text);
      const processingTime = Date.now() - startTime;

      // Create response
      let response;
      if (result.status === 'ok') {
        response = AmountDetectionResponse.success({
          currency: result.currency,
          amounts: result.amounts,
          confidence: result.confidence || 0,
          processingTime
        });
      } else if (result.status === 'no_amounts_found') {
        response = AmountDetectionResponse.noAmountsFound(result.reason);
        response.processingTime = processingTime;
      } else {
        response = AmountDetectionResponse.error(result.message || 'Processing failed', result.details);
        response.processingTime = processingTime;
      }

      Logger.info('Text processing completed', {
        status: response.status,
        amountsFound: response.amounts.length,
        processingTime
      });

      res.json(response.toJSON());

    } catch (error) {
      const processingTime = Date.now() - startTime;
      Logger.error('Error processing text input:', error);

      const response = AmountDetectionResponse.error('Internal server error', error.message);
      response.processingTime = processingTime;

      res.status(500).json(response.toJSON());
    }
  }

  /**
   * Process image input for amount detection
   */
  async detectAmountsFromImage(req, res) {
    const startTime = Date.now();

    try {
      // Validate file
      const fileValidation = ValidationUtils.validateImageFile(req.file);
      if (!fileValidation.isValid) {
        return res.status(400).json(
          AmountDetectionResponse.error('Invalid file', fileValidation.error).toJSON()
        );
      }

      // Create request model
      const request = new AmountDetectionRequest({
        imageBuffer: req.file.buffer,
        options: req.body.options ? JSON.parse(req.body.options) : {}
      });

      Logger.info('Processing image input for amount detection', {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        requestId: req.headers['x-request-id'] || 'unknown'
      });

      // Process request
      const result = await this.amountDetectionService.processImage(request.imageBuffer);
      const processingTime = Date.now() - startTime;

      // Create response
      let response;
      if (result.status === 'ok') {
        response = AmountDetectionResponse.success({
          currency: result.currency,
          amounts: result.amounts,
          confidence: result.confidence || 0,
          processingTime
        });
      } else if (result.status === 'no_amounts_found') {
        response = AmountDetectionResponse.noAmountsFound(result.reason);
        response.processingTime = processingTime;
      } else {
        response = AmountDetectionResponse.error(result.message || 'Processing failed', result.details);
        response.processingTime = processingTime;
      }

      Logger.info('Image processing completed', {
        status: response.status,
        amountsFound: response.amounts.length,
        processingTime
      });

      res.json(response.toJSON());

    } catch (error) {
      const processingTime = Date.now() - startTime;
      Logger.error('Error processing image input:', error);

      const response = AmountDetectionResponse.error('Internal server error', error.message);
      response.processingTime = processingTime;

      res.status(500).json(response.toJSON());
    }
  }
}

module.exports = AmountDetectionController;