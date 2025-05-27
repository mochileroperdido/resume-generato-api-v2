const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { loadTemplate, generateDocument } = require('../../utils/templateUtils');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: 'POST, OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Main endpoint to generate resume
app.post('/generate-resume', async (req, res) => {
  try {
    const { templateId = 'default', userData } = req.body;
    
    // Validate request
    if (!userData) {
      return res.status(400).json({ 
        error: 'Missing userData in request body'
      });
    }
    
    // Load template
    const templateContent = loadTemplate(templateId);
    
    // Generate document
    const buffer = generateDocument(templateContent, userData);
    
    // Generate a filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `resume-${userData.name || 'document'}-${timestamp}.docx`;
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    // Send the document
    res.send(buffer);
    
  } catch (error) {
    console.error(`Error generating resume: ${error.message}`);
    
    if (error.message.includes('Template not found')) {
      return res.status(404).json({
        error: 'Template not found',
        message: error.message
      });
    }
    
    return res.status(500).json({
      error: 'Error generating resume',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Export the serverless function
module.exports.handler = serverless(app);