/**
 * Logging utilities for the application
 */

class Logger {
  constructor() {
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };

    this.currentLevel = process.env.LOG_LEVEL
      ? this.logLevels[process.env.LOG_LEVEL.toUpperCase()]
      : this.logLevels.INFO;
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} metadata - Additional metadata
   */
  error(message, metadata = {}) {
    if (this.currentLevel >= this.logLevels.ERROR) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, metadata);
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} metadata - Additional metadata
   */
  warn(message, metadata = {}) {
    if (this.currentLevel >= this.logLevels.WARN) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, metadata);
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} metadata - Additional metadata
   */
  info(message, metadata = {}) {
    if (this.currentLevel >= this.logLevels.INFO) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, metadata);
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} metadata - Additional metadata
   */
  debug(message, metadata = {}) {
    if (this.currentLevel >= this.logLevels.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, metadata);
    }
  }

  /**
   * Log processing step
   * @param {string} step - Processing step name
   * @param {Object} data - Step data
   */
  logProcessingStep(step, data = {}) {
    this.info(`Processing step: ${step}`, data);
  }

  /**
   * Log OCR results
   * @param {Object} ocrResult - OCR processing result
   */
  logOCRResult(ocrResult) {
    this.info('OCR Processing Complete', {
      tokensFound: ocrResult.raw_tokens?.length || 0,
      currency: ocrResult.currency_hint,
      confidence: ocrResult.confidence
    });
  }

  /**
   * Log normalization results
   * @param {Object} normalizationResult - Normalization result
   */
  logNormalizationResult(normalizationResult) {
    this.info('Normalization Complete', {
      amountsNormalized: normalizationResult.normalized_amounts?.length || 0,
      confidence: normalizationResult.normalization_confidence
    });
  }

  /**
   * Log classification results
   * @param {Object} classificationResult - Classification result
   */
  logClassificationResult(classificationResult) {
    this.info('Classification Complete', {
      amountsClassified: classificationResult.amounts?.length || 0,
      confidence: classificationResult.confidence,
      types: classificationResult.amounts?.map(a => a.type) || []
    });
  }
}

// Export singleton instance
module.exports = new Logger();
