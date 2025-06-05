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
    
    const content = fs.readFileSync(templatePath, 'binary');
    console.log('Template loaded successfully, size:', content.length, 'bytes');
    return content;
  } catch (error) {
    console.error(`Error loading template: ${error.message}`);
    throw error;
  }
}

router.post('/', async (req, res) => {
  try {
    console.log('Received request with template ID:', req.body.templateId);
    const { templateId = 'default', userData } = req.body;
    
    if (!userData) {
      return res.status(400).json({ 
        error: 'Missing userData in request body'
      });
    }
    
    const templateContent = loadTemplate(templateId);
    console.log('Template loaded successfully');
    
    let zip;
    try {
      zip = new PizZip(templateContent);
      console.log('Template ZIP created successfully');
    } catch (error) {
      console.error('Error creating ZIP:', error);
      throw new Error('Failed to process template file');
    }
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter() {
        return '';
      }
    });
    
    console.log('Template data:', JSON.stringify(userData, null, 2));
    
    try {
      doc.setData(userData);
      doc.render();
      console.log('Document rendered successfully');
      
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9
        }
      });
      
      console.log('Generated buffer size:', buffer.length, 'bytes');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `resume-${userData.name || 'document'}-${timestamp}.docx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      res.send(buffer);
      console.log('Response sent successfully');
      
    } catch (error) {
      console.error('Template processing error:', error);
      
      if (error.properties && error.properties.errors) {
        const errorMessages = error.properties.errors.map(e => e.message).join(', ');
        return res.status(500).json({
          error: 'Template processing error',
          message: errorMessages
        });
      }
      
      throw error;
    }
    
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

app.use('/.netlify/functions/generate-resume', router);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

module.exports.handler = serverless(app);