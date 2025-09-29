# AI-Powered Amount Detection Service

A Node.js service that extracts and classifies financial amounts from medical documents (bills, receipts) using OCR, normalization, contextual classification, and confidence blending.

## Features

- **OCR Text Extraction** – Tesseract-based, with image preprocessing (grayscale, contrast, scale)
- **Smart Normalization** – Fixes OCR digit/character issues (e.g. `T0tal` → `Total`, `l200` → `1200`)
- **Context Classification** – Rule + context window + magnitude heuristics for: `total_bill`, `paid`, `due`, `discount`, `tax`, `consultation_fee`, `medicine_cost`, `test_charges`, etc.
- **Paid Inference** – If `total` & `due` found but `paid` missing, infers `paid = total - due`
- **Percentage Handling** – Separates percentage tokens (e.g. `Discount: 10%`) from monetary amounts
- **Mixed Currency Detection** – Marks `currency: "MIXED"` when more than one currency symbol appears
- **Confidence Blending** – Final confidence = 60% classification + 25% normalization + 15% OCR
- **Noise Filtering** – Filters invoice numbers, IDs, short unrelated tokens, phone-like numbers
- **Dynamic Port Binding** – Starts at configured port (default 3100) and increments if busy
- **RESTful API** – Lightweight JSON responses with provenance

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-amount-detection

# Install dependencies
npm install

# Start the development server (nodemon)
npm run dev
```

The service will attempt to start at `http://localhost:3100` (or the next free port). Check console logs for the actual port.

## API Endpoints

| Method | Endpoint                    | Description                                            |
| ------ | --------------------------- | ------------------------------------------------------ |
| GET    | `/api/health`               | Health check                                           |
| POST   | `/api/detect-amounts-text`  | Process raw text input                                 |
| POST   | `/api/detect-amounts-image` | Process image (multipart form-data field name: `file`) |

### Example: Text-based Detection

Request:

```http
POST /api/detect-amounts-text
Content-Type: application/json

{
  "text": "Invoice #123\nTotal: INR 1200\nPaid: 1000\nDue: 200\nDiscount: 10%"
}
```

Sample Response (approximate):

```json
{
  "status": "ok",
  "processedAt": "2025-09-28T12:34:56.000Z",
  "currency": "INR",
  "amounts": [
    {
      "type": "total_bill",
      "value": 1200,
      "source": "text: 'Total: INR 1200'",
      "confidence": 0.9
    },
    {
      "type": "paid",
      "value": 1000,
      "source": "text: 'Paid: 1000'",
      "confidence": 0.86
    },
    {
      "type": "due",
      "value": 200,
      "source": "text: 'Due: 200'",
      "confidence": 0.84
    }
  ],
  "percentages": [{ "value": 10, "confidence": 0.9 }],
  "confidence": 0.87
}
```

If paid is missing but total and due present:

```json
{
  "amounts": [ { "type": "paid", "value": 1000, "inferred": true, "confidence": 0.82 }, ... ]
}
```

No usable amounts:

```json
{ "status": "no_amounts_found", "reason": "document too noisy" }
```

### Example: Image-based Detection

`POST /api/detect-amounts-image` (multipart form-data)
Field name: `file`

Returns same schema with `ocr_confidence` internally contributing to blended confidence.

## Processing Pipeline

### Step 1: OCR/Text Extraction

- Extracts raw numeric tokens & percentage tokens
- Detects single or mixed currency (`INR`, `USD`, `EUR`, `MIXED`)
- Provides extraction heuristic confidence

### Step 2: Normalization

- Fixes digit & character misreads
- Splits monetary vs percentage tokens
- Computes `normalization_confidence`

### Step 3: Context Classification

- Regex + context window + magnitude fallback
- Inference: derive `paid` if absent
- Removes likely invoice numbers from candidates
- Assigns per-amount confidence

### Step 4: Final Output

- Adds provenance (`source`) line snippets
- Blended confidence = `0.6 * classification_avg + 0.25 * normalization_confidence + 0.15 * ocr_confidence`
- Emits `percentages[]` separately (e.g., discounts)
- Supports `currency: "MIXED"`

## Error Handling

The service returns appropriate error responses for various scenarios:

```json
{
  "status": "no_amounts_found",
  "reason": "document too noisy"
}
```

```json
{
  "status": "error",
  "message": "Invalid file type",
  "details": "Only JPEG, PNG, and GIF files are allowed"
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Development

```bash
# Start development server with auto-reload
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Sample Usage

### JavaScript/Node.js

```javascript
const axios = require("axios");

// Text processing
const response = await axios.post(
  "http://localhost:3100/api/detect-amounts-text",
  {
    text: "Medical Bill: Total INR 1500, Paid INR 1200, Due INR 300 Discount: 5%",
  }
);

console.log(response.data);
```

### cURL

```bash
# Text processing
PORT=3100
curl -X POST http://localhost:$PORT/api/detect-amounts-text \
  -H "Content-Type: application/json" \
  -d '{"text": "Total: Rs 1200, Paid: Rs 1000, Due: Rs 200"}'

# Image processing
curl -X POST http://localhost:$PORT/api/detect-amounts-image \
  -F "file=@src/medical_bill.jpg"
```

## Configuration

Environment variables:

| Variable                         | Description                                          | Default     |
| -------------------------------- | ---------------------------------------------------- | ----------- |
| `PORT`                           | Base port (auto-increments if busy)                  | 3100        |
| `LOG_LEVEL`                      | Logging verbosity (`ERROR`, `WARN`, `INFO`, `DEBUG`) | INFO        |
| `NODE_ENV`                       | Runtime environment                                  | development |
| (future) `INFER_PAID`            | Enable/disable paid inference                        | true        |
| (future) `ENABLE_RECONCILIATION` | Include reconciliation summary                       | false       |

## Architecture

The project follows **MVC (Model-View-Controller)** pattern with a layered architecture:

```
src/
├── index.js                      # Main application entry point
├── controllers/
│   └── AmountDetectionController.js  # HTTP request/response handling
├── routes/
│   └── index.js                      # API route definitions
├── services/
│   ├── AmountDetectionService.js     # Main orchestration service
│   ├── OCRService.js                 # OCR and text extraction
│   ├── NormalizationService.js       # Error correction and normalization
│   └── ClassificationService.js     # Context-based classification
├── models/
│   ├── AmountDetectionRequest.js     # Request data model
│   └── AmountDetectionResponse.js    # Response data model
├── middleware/
│   └── index.js                      # Custom middleware (logging, validation)
└── utils/
    ├── ValidationUtils.js            # Input validation utilities
    └── Logger.js                     # Logging utilities
```

### Layer Responsibilities

- **Controllers**: Handle HTTP requests/responses, input validation, and error handling
- **Services**: Business logic and data processing
- **Models**: Data structures and validation
- **Routes**: API endpoint definitions and middleware
- **Middleware**: Cross-cutting concerns (logging, authentication, etc.)
- **Utils**: Helper functions and utilities

## Confidence Interpretation

- 0.90–0.95: Strong direct matches (patterns + consistent context)
- 0.75–0.89: Good matches; some inference or partial context
- 0.50–0.74: Heuristic / magnitude fallback
- < 0.50: Low certainty (usually fallback or noisy extraction)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions:

| Channel | Details                                                     |
| ------- | ----------------------------------------------------------- |
| Issues  | Open a GitHub issue (preferred for bugs & feature requests) |
| Email   | radhamadhabpattnaik23@gmail.com (project owner)             |

Please avoid sharing sensitive data (PHI/payment info) in issues or email. Provide redacted samples when reporting OCR or classification problems.
