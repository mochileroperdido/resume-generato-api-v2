# Resume Generation API

This API allows you to generate customized Word document resumes from templates.

## API Endpoints

### Generate Resume
```
POST /api/generate-resume
```

**Request Body**:
```json
{
  "templateId": "professional", 
  "userData": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-123-4567",
    "summary": "Experienced professional with 10+ years in software development",
    "experience": [
      {
        "title": "Senior Developer",
        "company": "Tech Corp",
        "startDate": "2018-01",
        "endDate": "Present",
        "description": "Led development of enterprise applications"
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Science in Computer Science",
        "institution": "University of Technology",
        "year": "2012"
      }
    ],
    "skills": ["JavaScript", "Node.js", "Express", "AWS"]
  }
}
```

**Parameters**:
- `templateId` (optional): The ID of the template to use. Available options:
  - `professional` - Professional resume layout
  - `creative` - Creative resume design
  - `academic` - Academic CV format
  - `default` - Standard resume template
- `userData`: Object containing all the data to populate the template

**Response**:
- Status: 200 OK
- Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
- Content-Disposition: attachment; filename=resume-[name]-[timestamp].docx

The response will be a downloadable Word document.

**Error Responses**:
- 400 Bad Request: Missing userData
- 404 Not Found: Template not found
- 500 Internal Server Error: Error generating resume

## Local Development

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm start
   ```
4. Test the API at http://localhost:8888/.netlify/functions/generate-resume

## Deployment

This API is designed to be deployed on Netlify:

1. Connect your repository to Netlify
2. Deploy with the following settings:
   - Build command: `npm run build`
   - Publish directory: Not needed for serverless functions
   - Functions directory: netlify/functions

## Template Structure

Templates are Word documents (.docx) with placeholders using the syntax `{variableName}`.

For example:
- `{name}`
- `{email}`
- `{phone}`
- `{summary}`

For arrays like experience and education, you can use:
```
{#experience}
Title: {title}
Company: {company}
{/experience}
```

## Security Considerations

- The API uses CORS to restrict access to allowed domains
- No data is stored on the server
- All processing happens in memory