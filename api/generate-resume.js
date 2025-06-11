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
  methods: 'GET, POST, OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

/**
 * Load template file as Buffer from bundled templates
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
    
    // In Netlify Functions, bundled files are accessible from the function root
    const templatePath = path.join(__dirname, '..', '..', 'templates', templateName);
    
    console.log('Loading template from:', templatePath);
    console.log('Current working directory:', process.cwd());
    console.log('Function directory:', __dirname);
    
    // Check if file exists
    if (!fs.existsSync(templatePath)) {
      // Try alternative paths in case of different bundling structure
      const altPath1 = path.join(process.cwd(), 'templates', templateName);
      const altPath2 = path.join(__dirname, 'templates', templateName);
      
      console.log('Template not found at primary path, trying alternatives:');
      console.log('Alt path 1:', altPath1, 'exists:', fs.existsSync(altPath1));
      console.log('Alt path 2:', altPath2, 'exists:', fs.existsSync(altPath2));
      
      if (fs.existsSync(altPath1)) {
        const content = fs.readFileSync(altPath1);
        console.log('Template loaded from alt path 1, size:', content.length, 'bytes');
        return content;
      } else if (fs.existsSync(altPath2)) {
        const content = fs.readFileSync(altPath2);
        console.log('Template loaded from alt path 2, size:', content.length, 'bytes');
        return content;
      }
      
      console.error('Template not found at any path:', templateName);
      throw new Error(`Template not found: ${templateName}`);
    }
    
    // Read as Buffer to prevent corruption in serverless environments
    const content = fs.readFileSync(templatePath);
    console.log('Template loaded successfully, size:', content.length, 'bytes');
    return content;
  } catch (error) {
    console.error(`Error loading template: ${error.message}`);
    throw error;
  }
}

/**
 * Generate Word document from template and user data using modern docxtemplater API
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
    // This avoids the deprecated setData() method
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter() {
        return '';
      },
      data: userData // Modern API: pass data directly to constructor
    });
    
    console.log('Docxtemplater instance created with data');
    
    // Render the document
    doc.render();
    console.log('Document rendered successfully');
    
    // Generate the final buffer with optimal compression
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
    
    // Handle docxtemplater-specific errors
    if (error.properties && error.properties.errors) {
      const errorMessages = error.properties.errors.map(e => 
        `${e.message} (tag: ${e.properties?.id || 'unknown'})`
      ).join(', ');
      throw new Error(`Template processing error: ${errorMessages}`);
    }
    
    throw error;
  }
}

/**
 * Debug endpoint to list available templates and their paths
 */
router.get('/debug/templates', (req, res) => {
  try {
    const templateDir = path.join(__dirname, '..', '..', 'templates');
    const altDir1 = path.join(process.cwd(), 'templates');
    const altDir2 = path.join(__dirname, 'templates');
    
    const debugInfo = {
      currentWorkingDirectory: process.cwd(),
      functionDirectory: __dirname,
      templatePaths: {
        primary: {
          path: templateDir,
          exists: fs.existsSync(templateDir),
          files: fs.existsSync(templateDir) ? fs.readdirSync(templateDir) : []
        },
        alternative1: {
          path: altDir1,
          exists: fs.existsSync(altDir1),
          files: fs.existsSync(altDir1) ? fs.readdirSync(altDir1) : []
        },
        alternative2: {
          path: altDir2,
          exists: fs.existsSync(altDir2),
          files: fs.existsSync(altDir2) ? fs.readdirSync(altDir2) : []
        }
      }
    };
    
    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Debug error',
      message: error.message
    });
  }
});

/**
 * 🔍 Test route to return the raw test-resume.docx to debug Netlify binary streaming
 */
router.get('/test-docx', (req, res) => {
  const templatePath = path.join(__dirname, '..', '..', 'templates', 'test-resume.docx');

  try {
    const buffer = fs.readFileSync(templatePath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="test-resume.docx"');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    res.end(buffer); // Use .end() for binary response
    console.log('Test DOCX sent successfully');
  } catch (err) {
    console.error('Error sending test-resume.docx:', err);
    res.status(500).json({ error: 'Failed to load test-resume.docx' });
  }
});


/**
 * Main resume generation endpoint
 */
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
    
    // Log the data being processed (truncated for security)
    const logData = {
      ...userData,
      // Truncate long descriptions for cleaner logs
      experience: userData.experience?.map(exp => ({
        ...exp,
        description: exp.description?.length > 100 ? 
          exp.description.substring(0, 100) + '...' : exp.description
      }))
    };
    console.log('Template data:', JSON.stringify(logData, null, 2));
    
    // Generate the document
    const buffer = generateDocument(templateContent, userData);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = (userData.name || 'document').replace(/[^a-zA-Z0-9-_]/g, '-');
    const filename = `resume-${safeName}-${timestamp}.docx`;
    
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

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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