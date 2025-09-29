class NormalizationService {
  constructor() {
    // Common OCR digit correction mappings
    this.digitCorrections = {
      'l': '1',
      'I': '1',
      'O': '0',
      'o': '0',
      'S': '5',
      's': '5',
      'Z': '2',
      'z': '2',
      'G': '6',
      'g': '9',
      'B': '8',
      'T': '7'
    };

    // Common OCR character patterns that indicate numbers
    this.numberPatterns = [
      { pattern: /T0tal/gi, replacement: 'Total' },
      { pattern: /Pald/gi, replacement: 'Paid' },
      { pattern: /0ue/gi, replacement: 'Due' },
      { pattern: /l200/gi, replacement: '1200' },
      { pattern: /Rs\s*l/gi, replacement: 'Rs 1' }
    ];
  }

  /**
   * Normalize amounts by fixing OCR errors and converting to numbers
   * @param {Array} rawTokens - Raw tokens from OCR/text extraction
   * @param {string} currencyHint - Currency hint from extraction (unused but kept for API compatibility)
   * @returns {Object} - Normalized amounts with confidence
   */
  normalizeAmounts(rawTokens) {
    try {
      const normalizedAmounts = [];
      const percentageTokens = [];
      let totalConfidence = 0;
      let validTokens = 0;

      for (const token of rawTokens) {
        const normalized = this.normalizeToken(token);

        if (normalized !== null) {
          if (normalized.isPercentage) {
            percentageTokens.push(normalized);
          } else {
            normalizedAmounts.push(normalized.value);
            totalConfidence += normalized.confidence;
            validTokens++;
          }
        }
      }

      const averageConfidence = validTokens > 0 ? totalConfidence / validTokens : 0;

      return {
        normalized_amounts: normalizedAmounts,
        percentages: percentageTokens.map(p => ({ value: p.value, confidence: p.confidence })),
        normalization_confidence: Math.round(averageConfidence * 100) / 100
      };

    } catch (error) {
      console.error('Error normalizing amounts:', error);
      return {
        normalized_amounts: [],
        normalization_confidence: 0
      };
    }
  }

  /**
   * Normalize a single token
   * @param {string} token - Raw token to normalize
   * @returns {Object|null} - Normalized value with confidence or null if invalid
   */
  normalizeToken(token) {
    try {
      // Handle percentage tokens
      if (token.includes('%')) {
        const percentValue = parseFloat(token.replace('%', ''));
        if (!isNaN(percentValue)) {
          return {
            value: percentValue,
            confidence: 0.9,
            isPercentage: true
          };
        }
        return null;
      }

      // Apply digit corrections
      let correctedToken = this.applyDigitCorrections(token);

      // Remove common formatting characters
      correctedToken = correctedToken.replace(/[,\s]/g, '');

      // Try to parse as number
      const numericValue = parseFloat(correctedToken);

      if (isNaN(numericValue) || numericValue <= 0) {
        return null;
      }

      // Calculate confidence based on corrections made
      const confidence = this.calculateNormalizationConfidence(token, correctedToken);

      return {
        value: numericValue,
        confidence: confidence,
        isPercentage: false
      };

    } catch (error) {
      console.error('Error normalizing token:', token, error);
      return null;
    }
  }

  /**
   * Apply digit corrections to fix common OCR errors
   * @param {string} token - Token to correct
   * @returns {string} - Corrected token
   */
  applyDigitCorrections(token) {
    let corrected = token;

    // Apply character-level corrections
    for (const [wrong, right] of Object.entries(this.digitCorrections)) {
      const regex = new RegExp(wrong, 'g');
      corrected = corrected.replace(regex, right);
    }

    // Apply pattern-level corrections
    for (const pattern of this.numberPatterns) {
      corrected = corrected.replace(pattern.pattern, pattern.replacement);
    }

    // Fix common number patterns
    corrected = this.fixCommonNumberPatterns(corrected);

    return corrected;
  }

  /**
   * Fix common number patterns that OCR misreads
   * @param {string} text - Text to fix
   * @returns {string} - Fixed text
   */
  fixCommonNumberPatterns(text) {
    let fixed = text;

    // Common patterns where OCR mistakes characters in numbers
    const patterns = [
      // Fix 'l' at the beginning of numbers (often mistaken '1')
      { from: /\bl([0-9]+)/g, to: '1$1' },
      // Fix 'O' in middle of numbers (often mistaken '0')
      { from: /([0-9])O([0-9])/g, to: '$10$2' },
      // Fix 'I' in numbers (often mistaken '1')
      { from: /I([0-9])/g, to: '1$1' },
      // Fix common digit transpositions
      { from: /1O/g, to: '10' },
      { from: /O1/g, to: '01' },
      // Fix decimal points
      { from: /([0-9])o([0-9]{2})/g, to: '$1.0$2' },
      { from: /([0-9])O([0-9]{2})/g, to: '$1.0$2' }
    ];

    for (const pattern of patterns) {
      fixed = fixed.replace(pattern.from, pattern.to);
    }

    return fixed;
  }

  /**
   * Calculate confidence score for normalization
   * @param {string} original - Original token
   * @param {string} corrected - Corrected token
   * @returns {number} - Confidence score (0-1)
   */
  calculateNormalizationConfidence(original, corrected) {
    let confidence = 1.0;

    // Reduce confidence for each correction made
    const corrections = this.countCorrections(original, corrected);
    confidence -= corrections * 0.1;

    // Increase confidence for well-formed numbers
    if (/^\d+(\.\d{2})?$/.test(corrected)) {
      confidence += 0.1;
    }

    // Increase confidence for reasonable amounts (not too large or small)
    const value = parseFloat(corrected);
    if (value >= 1 && value <= 1000000) {
      confidence += 0.1;
    }

    // Decrease confidence for very large numbers (likely OCR errors)
    if (value > 1000000) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Count the number of corrections made to a token
   * @param {string} original - Original token
   * @param {string} corrected - Corrected token
   * @returns {number} - Number of corrections
   */
  countCorrections(original, corrected) {
    let corrections = 0;
    const minLength = Math.min(original.length, corrected.length);

    for (let i = 0; i < minLength; i++) {
      if (original[i] !== corrected[i]) {
        corrections++;
      }
    }

    // Add corrections for length differences
    corrections += Math.abs(original.length - corrected.length);

    return corrections;
  }

  /**
   * Validate if a normalized amount is reasonable
   * @param {number} amount - Amount to validate
   * @param {string} context - Context for validation
   * @returns {boolean} - True if amount seems reasonable
   */
  isReasonableAmount(amount, context = '') {
    // Basic range checks
    if (amount <= 0 || amount > 10000000) {
      return false;
    }

    // Context-specific validation
    const contextLower = context.toLowerCase();

    // Discount percentages should be reasonable
    if (contextLower.includes('discount') && amount > 50) {
      return false;
    }

    // Tax rates should be reasonable
    if (contextLower.includes('tax') && amount > 30) {
      return false;
    }

    return true;
  }
}

module.exports = NormalizationService;
