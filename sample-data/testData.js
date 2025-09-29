// Sample medical bill text for testing
const sampleTexts = {
  // Sample 1: Clean text input
  cleanText: `
Medical Bill - City Hospital
Date: 2024-01-15
Patient: John Doe

Consultation Fee: INR 500
Lab Tests: INR 300
Medicines: INR 200
Total: INR 1000
Paid: INR 800
Due: INR 200
Discount: 10%
  `,

  // Sample 2: OCR-like text with errors (simulating OCR output)
  ocrText: `
T0tal: Rs l200 | Pald: 1000 | Due: 200
C0nsultati0n: Rs 5OO
Medicine: Rs 3O0
Tax: Rs lOO
  `,

  // Sample 3: Complex medical bill
  complexBill: `
APOLLO HOSPITAL
Invoice No: AP2024001
Date: 15-Jan-2024

Patient Name: Sarah Johnson
Patient ID: 12345

SERVICES:
Doctor Consultation      INR 800.00
Pathology Tests         INR 1,200.00
X-Ray Chest            INR 450.00
Medicines              INR 650.00
Room Charges           INR 2,500.00

Sub Total:             INR 5,600.00
CGST (9%):            INR 504.00
SGST (9%):            INR 504.00
Total Amount:          INR 6,608.00

Payment Received:      INR 6,608.00
Balance Due:           INR 0.00

Thank you for choosing Apollo Hospital
  `,

  // Sample 4: Partial/damaged text (simulating crumpled receipt)
  damagedText: `
...tal Hos...
...nsultation: Rs 6OO
Lab Te...: Rs 4OO
Med...nes: Rs 2OO
T0tal: Rs l2OO
Pai...: Rs lOOO
...e: Rs 2OO
  `,

  // Sample 5: Simple pharmacy receipt
  pharmacyReceipt: `
MedPlus Pharmacy
Receipt #: RX789123

Paracetamol 500mg x10    Rs 45
Cough Syrup 100ml        Rs 120
Bandages                 Rs 35
Antiseptic cream         Rs 80

Subtotal:               Rs 280
Discount (5%):          Rs 14
GST (12%):             Rs 32
Total:                 Rs 298
Cash Paid:             Rs 300
Change:                Rs 2
  `
};

// Expected outputs for validation
const expectedOutputs = {
  cleanText: {
    currency: "INR",
    amounts: [
      { type: "consultation_fee", value: 500, source: "text: 'Consultation Fee: INR 500'" },
      { type: "test_charges", value: 300, source: "text: 'Lab Tests: INR 300'" },
      { type: "medicine_cost", value: 200, source: "text: 'Medicines: INR 200'" },
      { type: "total_bill", value: 1000, source: "text: 'Total: INR 1000'" },
      { type: "paid", value: 800, source: "text: 'Paid: INR 800'" },
      { type: "due", value: 200, source: "text: 'Due: INR 200'" }
    ],
    status: "ok"
  },

  ocrText: {
    currency: "INR",
    amounts: [
      { type: "total_bill", value: 1200, source: "text: 'T0tal: Rs l200'" },
      { type: "paid", value: 1000, source: "text: 'Pald: 1000'" },
      { type: "due", value: 200, source: "text: 'Due: 200'" },
      { type: "consultation_fee", value: 500, source: "text: 'C0nsultati0n: Rs 5OO'" },
      { type: "medicine_cost", value: 300, source: "text: 'Medicine: Rs 3O0'" },
      { type: "tax", value: 100, source: "text: 'Tax: Rs lOO'" }
    ],
    status: "ok"
  }
};

module.exports = {
  sampleTexts,
  expectedOutputs
};