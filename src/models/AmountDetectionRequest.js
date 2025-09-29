/**
 * Amount Detection Request Model
 */
class AmountDetectionRequest {
  constructor(data) {
    this.text = data.text || '';
    this.imageBuffer = data.imageBuffer || null;
    this.options = data.options || {};
    this.timestamp = new Date();
  }

  validate() {
    if (!this.text && !this.imageBuffer) {
      return {
        isValid: false,
        errors: ['Either text or image is required']
      };
    }

    if (this.text && typeof this.text !== 'string') {
      return {
        isValid: false,
        errors: ['Text must be a string']
      };
    }

    if (this.text && this.text.length > 10000) {
      return {
        isValid: false,
        errors: ['Text is too long (max 10,000 characters)']
      };
    }

    return { isValid: true, errors: [] };
  }
}

module.exports = AmountDetectionRequest;