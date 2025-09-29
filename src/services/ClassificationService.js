const natural = require('natural');

class ClassificationService {
  constructor() {
    // Initialize tokenizer and stemmer
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    // Define classification patterns and keywords
    this.classificationRules = [
      {
        type: 'total_bill',
        keywords: ['total', 'grand total', 'amount', 'sum', 'bill amount', 'invoice total'],
        patterns: [
          /total[:\s]*(?:amount[:\s]*)?(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /(?:grand|final|net)\s*total[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /bill\s*amount[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi
        ],
        priority: 10
      },
      {
        type: 'paid',
        keywords: ['paid', 'payment', 'received', 'cash received', 'amount paid'],
        patterns: [
          /paid[:\s]*(?:amount[:\s]*)?(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /payment[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /(?:cash\s*)?received[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /amount\s*paid[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /amt\s*paid[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /paid\s*amount[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /net\s*paid[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /amount\s*(?:recd|received)[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi
        ],
        priority: 8
      },
      {
        type: 'due',
        keywords: ['due', 'balance', 'pending', 'outstanding', 'remaining', 'patient balance', 'amount due'],
        patterns: [
          /(?:amount\s*)?due[:\s]*(?:\$|inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /(?:patient\s*)?balance[:\s]*(?:\$|inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /(?:amount\s*)?pending[:\s]*(?:\$|inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /pay\s*this\s*amount[:\s]*(?:\$|inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi
        ],
        priority: 7
      },
      {
        type: 'insurance_balance',
        keywords: ['insurance balance', 'insurance', 'coverage'],
        patterns: [
          /insurance\s*balance[:\s]*(?:\$|inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi
        ],
        priority: 8
      },
      {
        type: 'previous_balance',
        keywords: ['previous balance', 'prior balance', 'opening balance'],
        patterns: [
          /previous\s*balance[:\s]*(?:\$|inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /prior\s*balance[:\s]*(?:\$|inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi
        ],
        priority: 6
      },
      {
        type: 'discount',
        keywords: ['discount', 'off', 'reduction', 'deduction', 'rebate'],
        patterns: [
          /discount[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /discount[:\s]*([0-9]+(?:\.[0-9]+)?)\s*%/gi,
          /([0-9]+(?:\.[0-9]+)?)\s*%\s*off/gi,
          /(?:flat\s*)?([0-9,]+(?:\.[0-9]{2})?)\s*(?:inr|rs\.?|₹)?\s*off/gi
        ],
        priority: 6
      },
      {
        type: 'tax',
        keywords: ['tax', 'gst', 'vat', 'cgst', 'sgst', 'igst', 'service tax'],
        patterns: [
          /(?:gst|vat|tax)[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /(?:cgst|sgst|igst)[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /service\s*tax[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi
        ],
        priority: 5
      },
      {
        type: 'consultation_fee',
        keywords: ['consultation', 'doctor fee', 'consultation fee', 'visit charge'],
        patterns: [
          /consultation[:\s]*(?:fee[:\s]*)?(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /doctor\s*fee[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /visit\s*charge[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi
        ],
        priority: 4
      },
      {
        type: 'medicine_cost',
        keywords: ['medicine', 'medication', 'drugs', 'pharmacy', 'prescription'],
        patterns: [
          /medicine[:\s]*(?:cost[:\s]*)?(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /medication[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /pharmacy[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi
        ],
        priority: 3
      },
      {
        type: 'test_charges',
        keywords: ['test', 'lab', 'investigation', 'pathology', 'scan', 'x-ray'],
        patterns: [
          /(?:lab\s*)?test[:\s]*(?:charges[:\s]*)?(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /(?:pathology|investigation)[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
          /(?:scan|x-ray)[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi
        ],
        priority: 2
      }
    ];
  }

  /**
   * Classify amounts based on context
   * @param {string} text - Original text for context
   * @param {Array} amounts - Normalized amounts to classify
   * @returns {Object} - Classification result with labeled amounts
   */
  classifyAmounts(text, amounts) {
    try {
      // Filter out invoice/reference numbers (e.g., "Invoice #123") so they are not misclassified as monetary amounts
      const invoiceMatch = text.match(/invoice\s*#?\s*(\d{1,6})/i);
      if (invoiceMatch) {
        const invoiceNumber = parseFloat(invoiceMatch[1]);
        if (!isNaN(invoiceNumber) && invoiceNumber < 500) {
          amounts = amounts.filter(a => a !== invoiceNumber);
        }
      }

  const classifiedAmounts = [];
  const usedAmounts = new Set();

      // First pass: Direct pattern matching
      for (const rule of this.classificationRules) {
        for (const pattern of rule.patterns) {
          let match;
          const regex = new RegExp(pattern.source, pattern.flags);

          while ((match = regex.exec(text)) !== null) {
            const matchedValue = parseFloat(match[1].replace(/,/g, ''));

            // Find corresponding amount in the normalized amounts
            const closestAmount = this.findClosestAmount(matchedValue, amounts, usedAmounts);

            if (closestAmount !== null) {
              const confidence = this.calculateMatchConfidence(matchedValue, closestAmount, rule.priority);
              classifiedAmounts.push({
                type: rule.type,
                value: closestAmount,
                confidence: confidence
              });

              usedAmounts.add(closestAmount);
            }
          }
        }
      }

      // Second pass: Context-based classification for unmatched amounts
      const remainingAmounts = amounts.filter(amount => !usedAmounts.has(amount));

      for (const amount of remainingAmounts) {
        const classification = this.classifyByContext(text, amount);
        if (classification) {
          classifiedAmounts.push(classification);
        }
      }

      // Third pass: Fallback classification for any remaining amounts
      const stillRemaining = amounts.filter(amount =>
        !classifiedAmounts.some(classified => classified.value === amount)
      );

      for (const amount of stillRemaining) {
        classifiedAmounts.push({
          type: 'other_amount',
          value: amount,
          confidence: 0.3
        });
      }

      // Post-process to remove illogical duplicates / enforce rules
      const processed = this.postProcessClassifications(classifiedAmounts);

      // Recalculate confidence after processing
      const averageConfidence = processed.length > 0 ?
        (processed.reduce((sum, a) => sum + (a.confidence || 0), 0) / processed.length) : 0;

      return {
        amounts: processed,
        confidence: Math.round(averageConfidence * 100) / 100
      };

    } catch (error) {
      console.error('Error classifying amounts:', error);
      return {
        amounts: amounts.map(amount => ({
          type: 'unknown',
          value: amount,
          confidence: 0.1
        })),
        confidence: 0.1
      };
    }
  }

  /**
   * Find the closest amount from the list that hasn't been used
   * @param {number} targetValue - Target value to match
   * @param {Array} amounts - Available amounts
   * @param {Set} usedAmounts - Already used amounts
   * @returns {number|null} - Closest matching amount or null
   */
  findClosestAmount(targetValue, amounts, usedAmounts) {
    const availableAmounts = amounts.filter(amount => !usedAmounts.has(amount));

    if (availableAmounts.length === 0) {
      return null;
    }

    // Find exact match first
    if (availableAmounts.includes(targetValue)) {
      return targetValue;
    }

    // Find closest match within reasonable tolerance (10%)
    let closestAmount = null;
    let smallestDifference = Infinity;

    for (const amount of availableAmounts) {
      const difference = Math.abs(amount - targetValue);
      const tolerance = targetValue * 0.1; // 10% tolerance

      if (difference <= tolerance && difference < smallestDifference) {
        closestAmount = amount;
        smallestDifference = difference;
      }
    }

    return closestAmount;
  }

  /**
   * Classify amount based on surrounding context
   * @param {string} text - Full text for context
   * @param {number} amount - Amount to classify
   * @returns {Object|null} - Classification result or null
   */
  classifyByContext(text, amount) {
    const amountStr = amount.toString();

    // Find the position of the amount in the text
    const amountIndex = text.toLowerCase().indexOf(amountStr);
    if (amountIndex === -1) {
      return this.classifyByMagnitude(amount);
    }

    // Extract context around the amount (50 characters before and after)
    const start = Math.max(0, amountIndex - 50);
    const end = Math.min(text.length, amountIndex + amountStr.length + 50);
    const context = text.substring(start, end).toLowerCase();

    // Check each classification rule for keyword matches in context
    for (const rule of this.classificationRules) {
      for (const keyword of rule.keywords) {
        if (context.includes(keyword.toLowerCase())) {
          // Higher confidence for better keyword matches
          const baseConfidence = 0.75;
          const priorityAdjustment = (10 - rule.priority) * 0.02; // Higher priority = higher confidence
          return {
            type: rule.type,
            value: amount,
            confidence: Math.min(0.95, baseConfidence + priorityAdjustment)
          };
        }
      }
    }

    return this.classifyByMagnitude(amount);
  }

  /**
   * Classify amount based on its magnitude (fallback method)
   * @param {number} amount - Amount to classify
   * @returns {Object} - Classification result
   */
  classifyByMagnitude(amount) {
    // Use typical ranges for medical bill amounts with better confidence
    if (amount >= 1000) {
      return { type: 'total_bill', value: amount, confidence: 0.6 };
    } else if (amount >= 500) {
      return { type: 'consultation_fee', value: amount, confidence: 0.55 };
    } else if (amount >= 100) {
      return { type: 'medicine_cost', value: amount, confidence: 0.5 };
    } else if (amount >= 10) {
      return { type: 'test_charges', value: amount, confidence: 0.45 };
    } else {
      return { type: 'other_amount', value: amount, confidence: 0.3 };
    }
  }

  /**
   * Calculate confidence for a matched amount
   * @param {number} matchedValue - Value from pattern match
   * @param {number} actualAmount - Actual amount from normalized list
   * @param {number} rulePriority - Priority of the matching rule
   * @returns {number} - Confidence score
   */
  calculateMatchConfidence(matchedValue, actualAmount, rulePriority) {
    // Base + priority boost (higher priority => higher confidence)
    const base = 0.7;
    const priorityBoost = (rulePriority / 10) * 0.2; // up to +0.2
    let confidence = base + priorityBoost; // total_bill (10) => 0.9, paid (8) => 0.86, due (7) => 0.84

    // Penalize if mismatch beyond tolerance
    const difference = Math.abs(matchedValue - actualAmount);
    const tolerance = matchedValue * 0.05; // 5% tolerance
    if (difference > tolerance) {
      confidence -= Math.min(0.25, (difference / matchedValue) * 0.4);
    }

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Post-process classifications to ensure logical consistency
   * @param {Array} classifications - Raw classifications
   * @returns {Array} - Post-processed classifications
   */
  postProcessClassifications(classifications) {
    // Sort by confidence
    classifications.sort((a, b) => b.confidence - a.confidence);

    // Apply business logic rules
    const processed = [];
    const typesSeen = new Set();

    for (const classification of classifications) {
      // Avoid duplicate types unless it makes sense
      if (typesSeen.has(classification.type)) {
        // Allow multiple medicine costs, test charges, etc.
        if (!['medicine_cost', 'test_charges', 'other_amount'].includes(classification.type)) {
          continue;
        }
      }

      processed.push(classification);
      typesSeen.add(classification.type);
    }

    // Inference: If total and due exist but paid missing, infer paid = total - due
    const hasPaid = processed.some(c => c.type === 'paid');
    if (!hasPaid) {
      const total = processed.find(c => c.type === 'total_bill');
      const due = processed.find(c => c.type === 'due');
      if (total && due && typeof total.value === 'number' && typeof due.value === 'number') {
        const diff = total.value - due.value;
        if (diff > 0.01) { // meaningful positive difference
          const inferredValue = parseFloat(diff.toFixed(2));
          const alreadyExists = processed.some(c => c.value === inferredValue);
          if (!alreadyExists) {
            // Confidence derived from supporting amounts
            const baseConf = ((total.confidence || 0.7) + (due.confidence || 0.7)) / 2 * 0.95;
            processed.push({
              type: 'paid',
              value: inferredValue,
              confidence: Math.min(0.9, Math.round(baseConf * 100) / 100),
              inferred: true
            });
          }
        }
      }
    }

    return processed;
  }
}

module.exports = ClassificationService;
