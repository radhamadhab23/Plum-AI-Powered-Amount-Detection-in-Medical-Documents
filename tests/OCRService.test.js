const OCRService = require('../src/services/OCRService');

describe('OCRService', () => {
  let ocrService;

  beforeEach(() => {
    ocrService = new OCRService();
  });

  afterEach(async () => {
    await ocrService.cleanup();
  });

  describe('extractTokensFromText', () => {
    test('should extract tokens from clean text', () => {
      const text = 'Total: INR 1200 | Paid: 1000 | Due: 200 | Discount: 10%';
      const result = ocrService.extractTokensFromText(text);

      expect(result.raw_tokens).toContain('1200');
      expect(result.raw_tokens).toContain('1000');
      expect(result.raw_tokens).toContain('200');
      expect(result.raw_tokens).toContain('10%');
      expect(result.currency_hint).toBe('INR');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should extract tokens from OCR-like text', () => {
      const text = 'T0tal: Rs l200 | Pald: 1000 | Due: 200';
      const result = ocrService.extractTokensFromText(text);

      expect(result.raw_tokens.length).toBeGreaterThan(0);
      expect(result.currency_hint).toBe('INR');
    });

    test('should return no_amounts_found for text without numbers', () => {
      const text = 'This is just text without any amounts';
      const result = ocrService.extractTokensFromText(text);

      expect(result.status).toBe('no_amounts_found');
      expect(result.reason).toBe('no numeric tokens detected');
    });

    test('should handle multiple currency formats', () => {
      const testCases = [
        { text: 'Amount: $100', expectedCurrency: 'USD' },
        { text: 'Price: €50', expectedCurrency: 'EUR' },
        { text: 'Cost: ₹200', expectedCurrency: 'INR' },
        { text: 'Total: Rs. 300', expectedCurrency: 'INR' }
      ];

      testCases.forEach(({ text, expectedCurrency }) => {
        const result = ocrService.extractTokensFromText(text);
        expect(result.currency_hint).toBe(expectedCurrency);
      });
    });
  });

  describe('normalizeCurrency', () => {
    test('should normalize currency codes correctly', () => {
      expect(ocrService.normalizeCurrency('INR')).toBe('INR');
      expect(ocrService.normalizeCurrency('Rs')).toBe('INR');
      expect(ocrService.normalizeCurrency('Rs.')).toBe('INR');
      expect(ocrService.normalizeCurrency('₹')).toBe('INR');
      expect(ocrService.normalizeCurrency('$')).toBe('USD');
      expect(ocrService.normalizeCurrency('€')).toBe('EUR');
      expect(ocrService.normalizeCurrency('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('calculateConfidence', () => {
    test('should calculate appropriate confidence scores', () => {
      // High confidence: multiple tokens with currency and context
      const highConfText = 'Total: INR 1200 | Paid: 1000 | Due: 200';
      const highConfResult = ocrService.extractTokensFromText(highConfText);
      expect(highConfResult.confidence).toBeGreaterThan(0.7);

      // Medium confidence: tokens but no clear context
      const medConfText = '1200 1000 200';
      const medConfResult = ocrService.extractTokensFromText(medConfText);
      expect(medConfResult.confidence).toBeLessThan(0.7);
      expect(medConfResult.confidence).toBeGreaterThan(0.3);
    });
  });
});
