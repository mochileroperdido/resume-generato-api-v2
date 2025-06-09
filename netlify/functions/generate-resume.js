const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: 'POST, OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

/**
 * Load template file as Buffer to prevent corruption in serverless environments
 * @param {string} templateId - The template identifier
 * @returns {Buffer} - Template content as Buffer
 */
function loadTemplate(templateId) {
  try {
    const templateMap = {
      'professional': 'professional-resume.docx',
      'creative': 'creative-resume.docx',
      'academic': 'academic-resume.docx',
      'test': 'test-resume.docx',
      'default': 'default-resume.docx'
    };
    
    const templateName = templateMap[templateId] || templateMap.default;
    const templatePath = path.join(__dirname, '..', '..', 'templates', templateName);
    
    console.log('Loading template from:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      console.error('Template not found at path:', templatePath);
      throw new Error(`Template not found: ${templateName}`);
    }
    
    // Read as Buffer instead of binary string to prevent corruption
    const content = fs.readFileSync(templatePath);
    console.log('Template loaded successfully, size:', content.length, 'bytes');
    return content;
  } catch (error) {
    console.error(`Error loading template: ${error.message}`);
    throw error;
  }
}

/**
 * Generate Word document from template and user data
 * @param {Buffer} templateContent - Template content as Buffer
 * @param {Object} userData - User data to inject into template
 * @returns {Buffer} - Generated document buffer
 */
function generateDocument(templateContent, userData) {
  try {
    // Create ZIP from template content
    const zip = new PizZip(templateContent);
    console.log('Template ZIP created successfully');
    
    // Create Docxtemplater instance with data passed directly in constructor
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter() {
        return '';
      },
      data: userData // Pass data directly to avoid deprecated setData method
    });
    
    console.log('Docxtemplater instance created with data');
    
    // Render the document
    doc.render();
    console.log('Document rendered successfully');
    
    // Generate the final buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9
      }
    });
    
    console.log('Generated buffer size:', buffer.length, 'bytes');
    return buffer;
    
  } catch (error) {
    console.error('Document generation error:', error);
    
    if (error.properties && error.properties.errors) {
      const errorMessages = error.properties.errors.map(e => e.message).join(', ');
      throw new Error(`Template processing error: ${errorMessages}`);
    }
    
    throw error;
  }
}

router.post('/', async (req, res) => {
  try {
    console.log('Received request with template ID:', req.body.templateId);
    const { templateId = 'default', userData } = req.body;
    
    // Validate required userData
    if (!userData) {
      return res.status(400).json({ 
        error: 'Missing userData',
        message: 'Missing userData in request body'
      });
    }
    
    // Load template as Buffer
    const templateContent = loadTemplate(templateId);
    console.log('Template loaded successfully');
    
    // Log the data being processed
    console.log('Template data:', JSON.stringify(userData, null, 2));
    
    // Generate the document
    const buffer = generateDocument(templateContent, userData);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `resume-${userData.name || 'document'}-${timestamp}.docx`;
    
    // Set response headers for Word document download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the document
    res.send(buffer);
    console.log('Response sent successfully');
    
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
      message: error.message,
      details: error.properties || {}
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use('/.netlify/functions/generate-resume', router);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

module.exports.handler = serverless(app);