/**
 * Validation utilities for amount detection service
 */

class ValidationUtils {
  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @returns {Object} - Validation result
   */
  static validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.' };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: 'File too large. Maximum size is 10MB.' };
    }

    return { isValid: true };
  }

  /**
   * Validate text input
   * @param {string} text - Text to validate
   * @returns {Object} - Validation result
   */
  static validateTextInput(text) {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: 'Text input is required and must be a string' };
    }

    if (text.trim().length === 0) {
      return { isValid: false, error: 'Text input cannot be empty' };
    }

    if (text.length > 10000) {
      return { isValid: false, error: 'Text input too long. Maximum length is 10,000 characters.' };
    }

    return { isValid: true };
  }

  /**
   * Sanitize text input
   * @param {string} text - Text to sanitize
   * @returns {string} - Sanitized text
   */
  static sanitizeText(text) {
    if (!text) return '';
    // Remove potentially harmful characters while preserving meaningful content
    return text
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate amount values
   * @param {Array} amounts - Array of amounts to validate
   * @returns {Object} - Validation result
   */
  static validateAmounts(amounts) {
    if (!Array.isArray(amounts)) {
      return { isValid: false, error: 'Amounts must be an array' };
    }

    for (const amount of amounts) {
      if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
        return { isValid: false, error: 'All amounts must be positive numbers' };
      }

      if (amount > 1000000000) { // 1 billion limit
        return { isValid: false, error: 'Amount values are unreasonably large' };
      }
    }

    return { isValid: true };
  }
}

module.exports = ValidationUtils;
