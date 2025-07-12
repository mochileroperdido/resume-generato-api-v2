const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

/**
 * Load template file as Buffer from bundled templates
 * @param {string} templateId - The template identifier
 * @returns {Buffer} - Template content as Buffer
 */
function loadTemplate(templateId) {
  try {
    const templateMap = {
      'minimalistic': 'minimalistic-resume.docx',
      'default': 'default-resume.docx'
    };
    
    const templateName = templateMap[templateId] || templateMap.default;
    
    // In Vercel, try multiple paths to find templates
    const possiblePaths = [
      path.join(process.cwd(), 'templates', templateName),
      path.join(__dirname, '..', 'templates', templateName),
      path.join(__dirname, 'templates', templateName),
      path.join(process.cwd(), 'api', 'templates', templateName)
    ];
    
    console.log('Looking for template:', templateName);
    console.log('Current working directory:', process.cwd());
    console.log('Function directory:', __dirname);
    
    for (const templatePath of possiblePaths) {
      console.log('Trying path:', templatePath);
      if (fs.existsSync(templatePath)) {
        const content = fs.readFileSync(templatePath);
        console.log('Template loaded successfully from:', templatePath, 'size:', content.length, 'bytes');
        return content;
      }
    }
    
    console.error('Template not found at any path:', templateName);
    throw new Error(`Template not found: ${templateName}`);
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
    
    // Create Docxtemplater instance with modern API
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter() {
        return '';
      }
    });
    
    // Set data using the modern API
    doc.render(userData);
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
 * Main Vercel serverless function handler
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Handle different routes
    const { url, method } = req;
    
    // Health check endpoint
    if (method === 'GET' && url === '/health') {
      return res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    }
    
    // Debug templates endpoint
    if (method === 'GET' && url === '/debug/templates') {
      const templateDir = path.join(process.cwd(), 'templates');
      const altDir1 = path.join(__dirname, '..', 'templates');
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
      
      return res.status(200).json(debugInfo);
    }
    
    // Test DOCX endpoint
    if (method === 'GET' && url === '/test-docx') {
      try {
        const templateContent = loadTemplate('test');
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="test-resume.docx"');
        res.setHeader('Content-Length', templateContent.length);
        res.setHeader('Cache-Control', 'no-cache');
        
        return res.end(templateContent);
      } catch (err) {
        console.error('Error sending test-resume.docx:', err);
        return res.status(500).json({ error: 'Failed to load test-resume.docx' });
      }
    }
    
    // Main resume generation endpoint
    if (method === 'POST') {
      console.log('Received POST request for resume generation');
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
      return res.end(buffer);
    }
    
    // 404 for unmatched routes
    return res.status(404).json({
      error: 'Not Found',
      message: 'The requested endpoint does not exist'
    });
    
  } catch (error) {
    console.error(`Error in serverless function: ${error.message}`);
    console.error('Stack trace:', error.stack);
    
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
};