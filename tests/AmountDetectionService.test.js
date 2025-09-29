const AmountDetectionService = require('../src/services/AmountDetectionService');
const { sampleTexts } = require('../sample-data/testData');

describe('AmountDetectionService', () => {
  let service;

  beforeEach(() => {
    service = new AmountDetectionService();
  });

  describe('processText', () => {
    test('should process clean text correctly', async () => {
      const result = await service.processText(sampleTexts.cleanText);

      expect(result.status).toBe('ok');
      expect(result.currency).toBe('INR');
      expect(result.amounts).toHaveLength(6);

      // Check for specific amount types
      const amountTypes = result.amounts.map(a => a.type);
      expect(amountTypes).toContain('total_bill');
      expect(amountTypes).toContain('paid');
      expect(amountTypes).toContain('due');
    });

    test('should handle OCR-like text with errors', async () => {
      const result = await service.processText(sampleTexts.ocrText);

      expect(result.status).toBe('ok');
      expect(result.currency).toBe('INR');
      expect(result.amounts.length).toBeGreaterThan(0);

      // Check that normalization worked (T0tal -> Total, l200 -> 1200)
      const totalAmount = result.amounts.find(a => a.type === 'total_bill');
      expect(totalAmount).toBeDefined();
      expect(totalAmount.value).toBe(1200);
    });

    test('should handle complex medical bill', async () => {
      const result = await service.processText(sampleTexts.complexBill);

      expect(result.status).toBe('ok');
      expect(result.currency).toBe('INR');
      expect(result.amounts.length).toBeGreaterThan(5);

      // Should detect major amounts
      const amountValues = result.amounts.map(a => a.value);
      expect(amountValues).toContain(6608); // Total amount
      expect(amountValues).toContain(5600); // Subtotal
    });

    test('should return no_amounts_found for empty text', async () => {
      const result = await service.processText('');

      expect(result.status).toBe('no_amounts_found');
    });

    test('should return no_amounts_found for text without amounts', async () => {
      const result = await service.processText('This is just some text without any numbers or amounts.');

      expect(result.status).toBe('no_amounts_found');
    });
  });

  describe('generateFinalOutput', () => {
    test('should generate proper final output structure', () => {
      const amounts = [
        { type: 'total_bill', value: 1000 },
        { type: 'paid', value: 800 }
      ];

      const result = service.generateFinalOutput(
        'Total: 1000, Paid: 800',
        'INR',
        amounts
      );

      expect(result).toHaveProperty('currency', 'INR');
      expect(result).toHaveProperty('amounts');
      expect(result).toHaveProperty('status', 'ok');
      expect(result.amounts).toHaveLength(2);

      result.amounts.forEach(amount => {
        expect(amount).toHaveProperty('type');
        expect(amount).toHaveProperty('value');
        expect(amount).toHaveProperty('source');
      });
    });
  });

  describe('findSourceInText', () => {
    test('should find correct source text for amount', () => {
      const text = 'Total: INR 1000\nPaid: INR 800\nDue: INR 200';

      const source = service.findSourceInText(text, 1000);
      expect(source).toContain('Total: INR 1000');

      const paidSource = service.findSourceInText(text, 800);
      expect(paidSource).toContain('Paid: INR 800');
    });

    test('should provide fallback source when exact match not found', () => {
      const text = 'Some text without the exact amount';

      const source = service.findSourceInText(text, 1000);
      expect(source).toContain('amount 1000 detected');
    });
  });
});
