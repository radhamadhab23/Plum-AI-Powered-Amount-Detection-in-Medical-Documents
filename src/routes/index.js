const express = require('express');
const multer = require('multer');
const path = require('path');
const AmountDetectionController = require('../controllers/AmountDetectionController');
const { requestLogger, validateRequest } = require('../middleware');

const router = express.Router();

// Apply middleware to all routes
router.use(requestLogger);
router.use(validateRequest);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Initialize controller
const amountDetectionController = new AmountDetectionController();

// Bind controller methods to maintain 'this' context
const controller = {
  getApiInfo: amountDetectionController.getApiInfo.bind(amountDetectionController),
  healthCheck: amountDetectionController.healthCheck.bind(amountDetectionController),
  detectAmountsFromText: amountDetectionController.detectAmountsFromText.bind(amountDetectionController),
  detectAmountsFromImage: amountDetectionController.detectAmountsFromImage.bind(amountDetectionController)
};

// Routes
router.get('/', controller.getApiInfo);
router.get('/health', controller.healthCheck);
router.post('/detect-amounts-text', controller.detectAmountsFromText);
router.post('/detect-amounts-image', upload.single('image'), controller.detectAmountsFromImage);

module.exports = router;