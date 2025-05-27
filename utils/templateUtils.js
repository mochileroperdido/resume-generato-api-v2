const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

/**
 * Load a template by ID
 * @param {string} templateId - The ID of the template to load
 * @returns {string} - Binary content of the template
 * @throws {Error} - If template not found
 */
function loadTemplate(templateId) {
  try {
    // Template mapping
    const templateMap = {
      'professional': 'professional-resume.docx',
      'creative': 'creative-resume.docx',
      'academic': 'academic-resume.docx',
      'default': 'default-resume.docx'
    };
    
    const templateName = templateMap[templateId] || templateMap.default;
    const templatePath = path.resolve(__dirname, `../templates/${templateName}`);
    
    // Verify template exists
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    // Read the template
    return fs.readFileSync(templatePath, 'binary');
  } catch (error) {
    console.error(`Error loading template: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a Word document from template and data
 * @param {string} templateContent - Binary content of the template
 * @param {Object} data - Data to inject into the template
 * @returns {Buffer} - Generated document as a buffer
 */
function generateDocument(templateContent, data) {
  try {
    // Create a ZIP of the template
    const zip = new PizZip(templateContent);
    
    // Create a new document
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });
    
    // Set the data to inject
    doc.setData(data);
    
    // Render the document
    doc.render();
    
    // Get the binary content
    return doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
  } catch (error) {
    console.error(`Error generating document: ${error.message}`);
    throw error;
  }
}

module.exports = {
  loadTemplate,
  generateDocument
};