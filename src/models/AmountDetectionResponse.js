/**
 * Amount Detection Response Model
 */
class AmountDetectionResponse {
  constructor(data) {
    this.status = data.status || 'ok';
    this.currency = data.currency || 'UNKNOWN';
    this.amounts = data.amounts || [];
    this.confidence = data.confidence || 0;
    this.processedAt = new Date();
    this.processingTime = data.processingTime || 0;
  }

  static success(data) {
    return new AmountDetectionResponse({
      status: 'ok',
      ...data
    });
  }

  static error(message, details = null) {
    return new AmountDetectionResponse({
      status: 'error',
      message,
      details,
      amounts: []
    });
  }

  static noAmountsFound(reason) {
    return new AmountDetectionResponse({
      status: 'no_amounts_found',
      reason,
      amounts: []
    });
  }

  toJSON() {
    const result = {
      status: this.status,
      processedAt: this.processedAt
    };

    if (this.status === 'ok') {
      result.currency = this.currency;
      result.amounts = this.amounts;
      result.confidence = this.confidence;
    } else if (this.status === 'error') {
      result.message = this.message;
      if (this.details) result.details = this.details;
    } else if (this.status === 'no_amounts_found') {
      result.reason = this.reason;
    }

    if (this.processingTime > 0) {
      result.processingTime = `${this.processingTime}ms`;
    }

    return result;
  }
}

module.exports = AmountDetectionResponse;