const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: 'POST',
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Helper function to load template
function loadTemplate(templateId) {
  try {
    // Get template path - in production, this would be more sophisticated
    // For now, we'll use a simple mapping between IDs and filenames
    const templateMap = {
      'professional': 'professional-resume.docx',
      'creative': 'creative-resume.docx',
      'academic': 'academic-resume.docx',
      'default': 'default-resume.docx'
    };
    
    const templateName = templateMap[templateId] || templateMap.default;
    const templatePath = path.resolve(__dirname, `../../templates/${templateName}`);
    
    // Check if template exists
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    // Read the template
    const content = fs.readFileSync(templatePath, 'binary');
    return content;
  } catch (error) {
    console.error(`Error loading template: ${error.message}`);
    throw error;
  }
}

// Main endpoint to generate resume
app.post('/generate-resume', async (req, res) => {
  try {
    const { templateId = 'default', userData } = req.body;
    
    if (!userData) {
      return res.status(400).json({ 
        error: 'Missing userData in request body'
      });
    }
    
    // Load template
    const templateContent = loadTemplate(templateId);
    
    // Create a ZIP of the template
    const zip = new PizZip(templateContent);
    
    // Create a new document
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });
    
    // Set the data to inject
    doc.setData(userData);
    
    // Render the document
    doc.render();
    
    // Get the binary content
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
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

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Export the serverless function
module.exports.handler = serverless(app);