const mongoose = require('mongoose');

const ScanResultSchema = new mongoose.Schema({
  repositoryUrl: { type: String, required: true, unique: true },
  results: { type: Object, required: false, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScanResult', ScanResultSchema); 