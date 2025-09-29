const { createWorker } = require('tesseract.js');
const Jimp = require('jimp');

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Tesseract worker
   */
  async initializeWorker() {
    if (!this.isInitialized) {
      this.worker = await createWorker();
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
      this.isInitialized = true;
    }
  }

  /**
   * Extract numeric tokens from plain text
   * @param {string} text - Input text
   * @returns {Object} - Raw tokens with currency hint
   */
  extractTokensFromText(text) {
    try {
      // Define patterns for amount detection
      const amountPatterns = [
        /(?:INR|Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
        /([0-9,]+(?:\.[0-9]{2})?)\s*(?:INR|Rs\.?|₹)/gi,
        /\b([0-9,]+(?:\.[0-9]{2})?)\b/g
      ];

      const percentagePattern = /([0-9]+(?:\.[0-9]+)?)\s*%/g;
  const currencyPattern = /(?:INR|Rs\.?|₹|\$|USD|EUR|€)/gi;

      let rawTokens = [];
      const currencyMatches = [];

      // Extract currency indicators
      let match;
      while ((match = currencyPattern.exec(text)) !== null) {
        currencyMatches.push(match[0]);
      }

      // Extract amounts
      for (const pattern of amountPatterns) {
        while ((match = pattern.exec(text)) !== null) {
          const token = match[1] || match[0];
          if (token && !rawTokens.includes(token)) {
            rawTokens.push(token);
          }
        }
      }

      // Extract percentages
      while ((match = percentagePattern.exec(text)) !== null) {
        rawTokens.push(match[0]);
      }

      // Determine currency hint (detect mixed)
      let currencyHint = 'UNKNOWN';
      if (currencyMatches.length > 0) {
        const normalizedSet = new Set(currencyMatches.map(c => this.normalizeCurrency(c)));
        if (normalizedSet.size > 1) {
          currencyHint = 'MIXED';
        } else {
          currencyHint = [...normalizedSet][0];
        }
      }

      // Filter out invalid tokens and obvious non-currency amounts
      rawTokens = rawTokens.filter(token => {
        const numericValue = parseFloat(token.replace(/[,%]/g, ''));
        // Basic validation
        if (isNaN(numericValue) || numericValue <= 0) return false;
        // Filter out obvious non-currency patterns (more conservative)
        // Phone-like (leading common toll-free codes)
        if (/^(800|888|877|866|855|844)/.test(token)) return false;
        // Potential account / invoice ids: long digit sequences without decimal and no currency nearby
        if (numericValue > 10000000 && !token.includes('.') && currencyHint === 'UNKNOWN') return false;
        // Very short (1-2 digit) numbers not adjacent to currency keywords -> likely noise; allow if >=10 and context has billing words
        if (numericValue < 10 && !/(total|paid|due|tax|discount|bill|amount)/i.test(text)) return false;
        return true;
      });

      if (rawTokens.length === 0) {
        return {
          status: 'no_amounts_found',
          reason: 'document too noisy'
        };
      }

      return {
        raw_tokens: rawTokens,
        currency_hint: currencyHint,
        confidence: this.calculateConfidence(rawTokens, text)
      };

    } catch (error) {
      console.error('Error extracting tokens from text:', error);
      return {
        status: 'no_amounts_found',
        reason: 'text processing error'
      };
    }
  }

  /**
   * Extract numeric tokens from image using OCR
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Object} - Raw tokens with currency hint and extracted text
   */
  async extractTokensFromImage(imageBuffer) {
    try {
      await this.initializeWorker();

      // Preprocess image for better OCR
      const preprocessedImage = await this.preprocessImage(imageBuffer);

      // Perform OCR
      const { data: { text, confidence } } = await this.worker.recognize(preprocessedImage);

      if (!text || text.trim().length === 0) {
        return {
          status: 'no_amounts_found',
          reason: 'no text detected in image'
        };
      }

      // Extract tokens from OCR text
      const textResult = this.extractTokensFromText(text);

      if (textResult.status === 'no_amounts_found') {
        return {
          status: 'no_amounts_found',
          reason: 'no amounts found in OCR text'
        };
      }

      return {
        ...textResult,
        extracted_text: text,
        ocr_confidence: confidence / 100
      };

    } catch (error) {
      console.error('Error extracting tokens from image:', error);
      return {
        status: 'no_amounts_found',
        reason: 'image processing error'
      };
    }
  }

  /**
   * Preprocess image for better OCR results
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Buffer} - Preprocessed image buffer
   */
  async preprocessImage(imageBuffer) {
    try {
      const image = await Jimp.read(imageBuffer);

      // Apply preprocessing steps
      const processed = image
        .greyscale()                    // Convert to grayscale
        .contrast(0.3)                  // Increase contrast
        .normalize()                    // Normalize histogram
        .scale(2);                      // Scale up for better OCR

      return await processed.getBufferAsync(Jimp.MIME_PNG);
    } catch (error) {
      console.error('Error preprocessing image:', error);
      return imageBuffer; // Return original if preprocessing fails
    }
  }

  /**
   * Normalize currency indicators
   * @param {string} currency - Raw currency string
   * @returns {string} - Normalized currency code
   */
  normalizeCurrency(currency) {
    const currencyMap = {
      'INR': 'INR',
      'Rs': 'INR',
      'Rs.': 'INR',
      '₹': 'INR',
      '$': 'USD',
      'USD': 'USD',
      '€': 'EUR',
      'EUR': 'EUR'
    };

    return currencyMap[currency] || 'UNKNOWN';
  }

  /**
   * Calculate confidence score for token extraction
   * @param {Array} tokens - Extracted tokens
   * @param {string} text - Original text
   * @returns {number} - Confidence score (0-1)
   */
  calculateConfidence(tokens, text) {
    if (tokens.length === 0) return 0;

    let score = 0.5; // Base score

    // Increase confidence based on number of tokens
    score += Math.min(tokens.length * 0.1, 0.3);

    // Increase confidence if currency indicators are present
    if (/(?:INR|Rs\.?|₹|\$|USD|EUR|€)/i.test(text)) {
      score += 0.2;
    }

    // Increase confidence if context keywords are present
    const contextKeywords = /(?:total|paid|due|amount|bill|discount|tax)/i;
    if (contextKeywords.test(text)) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Cleanup worker
   */
  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.isInitialized = false;
    }
  }
}

module.exports = OCRService;
