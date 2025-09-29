const OCRService = require('./OCRService');
const NormalizationService = require('./NormalizationService');
const ClassificationService = require('./ClassificationService');

class AmountDetectionService {
  constructor() {
    this.ocrService = new OCRService();
    this.normalizationService = new NormalizationService();
    this.classificationService = new ClassificationService();
  }

  /**
   * Process text input for amount detection
   * @param {string} text - Input text to process
   * @returns {Object} - Processed result with detected amounts
   */
  async processText(text) {
    try {
      // Step 1: Extract raw tokens from text
      const ocrResult = this.ocrService.extractTokensFromText(text);

      if (ocrResult.status === 'no_amounts_found') {
        return ocrResult;
      }

      // Step 2: Normalize amounts
      const normalizedResult = this.normalizationService.normalizeAmounts(
        ocrResult.raw_tokens,
        ocrResult.currency_hint
      );

      // Step 3: Classify by context
      const classificationResult = this.classificationService.classifyAmounts(
        text,
        normalizedResult.normalized_amounts
      );

      // Step 4: Generate final output
      return this.generateFinalOutput(
        text,
        ocrResult.currency_hint,
        classificationResult.amounts,
        classificationResult.confidence,
        normalizedResult
      );

    } catch (error) {
      console.error('Error processing text:', error);
      return {
        status: 'error',
        message: 'Failed to process text',
        error: error.message
      };
    }
  }

  /**
   * Process image input with OCR for amount detection
   * @param {Buffer} imageBuffer - Image buffer to process
   * @returns {Object} - Processed result with detected amounts
   */
  async processImage(imageBuffer) {
    try {
      // Step 1: OCR extraction
      const ocrResult = await this.ocrService.extractTokensFromImage(imageBuffer);

      if (ocrResult.status === 'no_amounts_found') {
        return ocrResult;
      }

      // Step 2: Normalize amounts
      const normalizedResult = this.normalizationService.normalizeAmounts(
        ocrResult.raw_tokens,
        ocrResult.currency_hint
      );

      // Step 3: Classify by context
      const classificationResult = this.classificationService.classifyAmounts(
        ocrResult.extracted_text,
        normalizedResult.normalized_amounts
      );

      // Step 4: Generate final output
      return this.generateFinalOutput(
        ocrResult.extracted_text,
        ocrResult.currency_hint,
        classificationResult.amounts,
        classificationResult.confidence,
        normalizedResult,
        ocrResult
      );

    } catch (error) {
      console.error('Error processing image:', error);
      return {
        status: 'error',
        message: 'Failed to process image',
        error: error.message
      };
    }
  }

  /**
   * Generate final structured output
   * @param {string} originalText - Original text for provenance
   * @param {string} currency - Detected currency
   * @param {Array} amounts - Classified amounts
   * @param {number} confidence - Overall confidence score
   * @returns {Object} - Final structured output
   */
  generateFinalOutput(originalText, currency, amounts, confidence = 0, normalizationResult = {}, ocrResult = {}) {
    const result = {
      currency: currency || 'UNKNOWN',
      amounts: [],
      confidence: confidence,
      status: 'ok'
    };

    if (normalizationResult.percentages && normalizationResult.percentages.length > 0) {
      result.percentages = normalizationResult.percentages;
    }

    amounts.forEach(amount => {
      // Find the source text for provenance
      const sourceMatch = this.findSourceInText(originalText, amount.value);

      result.amounts.push({
        type: amount.type,
        value: amount.value,
        source: sourceMatch,
        confidence: typeof amount.confidence === 'number' ? amount.confidence : 0.5
      });
    });

    // If overall confidence wasn't propagated (e.g., legacy call path) but we have per-amount scores, aggregate them
    // Blend with normalization & OCR confidence if available
    const amountAvg = result.amounts.length > 0 ? (result.amounts.reduce((s,a)=>s+(a.confidence||0),0)/result.amounts.length) : 0;
    const normConf = normalizationResult.normalization_confidence || 0;
    const ocrConf = ocrResult.ocr_confidence || 0;
    // Weighted: 60% classification, 25% normalization, 15% OCR
    const blended = amountAvg * 0.6 + normConf * 0.25 + ocrConf * 0.15;
    result.confidence = Math.round(blended * 100) / 100;

    return result;
  }

  /**
   * Find source text for an amount value
   * @param {string} text - Original text
   * @param {number} value - Amount value to find
   * @returns {string} - Source text description
   */
  findSourceInText(text, value) {
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      if (line.includes(value.toString())) {
        return `text: '${line.trim()}'`;
      }
    }

    // Fallback: look for the value in the entire text
    const regex = new RegExp(`\\b${value}\\b`, 'i');
    const match = text.match(regex);
    if (match) {
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + match[0].length + 20);
      const context = text.substring(start, end).trim();
      return `text: '${context}'`;
    }

    return `text: 'amount ${value} detected'`;
  }
}

module.exports = AmountDetectionService;
