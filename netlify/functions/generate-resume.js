const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

// Create router instead of app
const router = express.Router();
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: 'POST, OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Helper function to load template
function loadTemplate(templateId) {
  try {
    const templateMap = {
      'professional': 'professional-resume.docx',
      'creative': 'creative-resume.docx',
      'academic': 'academic-resume.docx',
      'default': 'default-resume.docx'
    };
    
    const templateName = templateMap[templateId] || templateMap.default;
    // Update path resolution to work with Netlify functions
    const templatePath = path.join(__dirname, '..', '..', 'templates', templateName);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    return fs.readFileSync(templatePath, 'binary');
  } catch (error) {
    console.error(`Error loading template: ${error.message}`);
    throw error;
  }
}

// Main endpoint to generate resume - now using router
router.post('/', async (req, res) => {
  try {
    const { templateId = 'default', userData } = req.body;
    
    if (!userData) {
      return res.status(400).json({ 
        error: 'Missing userData in request body'
      });
    }
    
    const templateContent = loadTemplate(templateId);
    
    const zip = new PizZip(templateContent);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });
    
    doc.setData(userData);
    doc.render();
    
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `resume-${userData.name || 'document'}-${timestamp}.docx`;
    
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
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
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount the router at the function path
app.use('/.netlify/functions/generate-resume', router);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Export the serverless function
module.exports.handler = serverless(app);