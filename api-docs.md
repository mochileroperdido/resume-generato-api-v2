# Resume Generation API Documentation

## Overview

This API service generates customized Word document resumes from templates. It accepts JSON data containing resume content and returns a formatted Word document based on the selected template.

## Base URL

```
https://your-netlify-site.netlify.app/api
```

## Authentication

No authentication is required for this version of the API.

## Endpoints

### Generate Resume

```http
POST /generate-resume
```

Generates a resume document based on the provided data and template.

#### Request Headers

| Header        | Value            | Description                                 |
|---------------|------------------|---------------------------------------------|
| Content-Type  | application/json | Indicates the request body format is JSON   |

#### Request Body

```json
{
  "templateId": "professional",
  "userData": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-123-4567",
    "address": "123 Main St, Anytown, ST 12345",
    "summary": "Experienced software developer with 8 years of experience in web development.",
    "experience": [
      {
        "title": "Senior Developer",
        "company": "Tech Solutions Inc.",
        "location": "San Francisco, CA",
        "startDate": "2018-01",
        "endDate": "Present",
        "description": "Led a team of 5 developers working on enterprise web applications. Implemented CI/CD pipelines that reduced deployment time by 40%."
      },
      {
        "title": "Web Developer",
        "company": "Digital Innovations",
        "location": "Austin, TX",
        "startDate": "2015-03",
        "endDate": "2017-12",
        "description": "Developed responsive web applications using React and Node.js."
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Science in Computer Science",
        "institution": "University of Technology",
        "location": "Boston, MA",
        "year": "2015"
      }
    ],
    "skills": ["JavaScript", "React", "Node.js", "Express", "MongoDB", "AWS", "Docker", "CI/CD"]
  }
}
```

#### Request Parameters

| Parameter   | Type   | Required | Description                                                 |
|-------------|--------|----------|-------------------------------------------------------------|
| templateId  | string | No       | The ID of the template to use. Defaults to "default".       |
| userData    | object | Yes      | The data to populate the template with.                     |

Available template IDs:
- `professional` - Professional resume layout
- `creative` - Creative resume design
- `academic` - Academic CV format
- `default` - Standard resume template

#### Response

**Success Response (200 OK)**

The API returns a Word document (.docx) file with the following headers:

| Header               | Value                                                                    |
|----------------------|--------------------------------------------------------------------------|
| Content-Type         | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| Content-Disposition  | attachment; filename=resume-[name]-[timestamp].docx                      |

**Error Responses**

| Status Code | Error Code           | Description                                        |
|-------------|----------------------|----------------------------------------------------|
| 400         | Missing userData     | The request is missing the required userData field |
| 404         | Template not found   | The specified template ID could not be found       |
| 500         | Error generating resume | An internal server error occurred               |

Error response body example:

```json
{
  "error": "Missing userData",
  "message": "Missing userData in request body"
}
```

## Example Usage

### cURL

```bash
curl -X POST \
  https://your-netlify-site.netlify.app/api/generate-resume \
  -H 'Content-Type: application/json' \
  -d '{
    "templateId": "professional",
    "userData": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-123-4567",
      "summary": "Experienced software developer.",
      "experience": [
        {
          "title": "Senior Developer",
          "company": "Tech Solutions Inc.",
          "startDate": "2018-01",
          "endDate": "Present",
          "description": "Led development team."
        }
      ],
      "education": [
        {
          "degree": "BS in Computer Science",
          "institution": "University of Technology",
          "year": "2015"
        }
      ],
      "skills": ["JavaScript", "Node.js", "React"]
    }
  }' \
  -o resume.docx
```

### JavaScript

```javascript
async function generateResume() {
  const response = await fetch('https://your-netlify-site.netlify.app/api/generate-resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templateId: 'professional',
      userData: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        summary: 'Experienced software developer.',
        experience: [
          {
            title: 'Senior Developer',
            company: 'Tech Solutions Inc.',
            startDate: '2018-01',
            endDate: 'Present',
            description: 'Led development team.'
          }
        ],
        education: [
          {
            degree: 'BS in Computer Science',
            institution: 'University of Technology',
            year: '2015'
          }
        ],
        skills: ['JavaScript', 'Node.js', 'React']
      }
    })
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.docx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  } else {
    const errorData = await response.json();
    console.error('Error generating resume:', errorData);
  }
}
```

## Rate Limiting

No rate limiting is currently implemented for this API.

## Support

For support or feature requests, please file an issue on the GitHub repository.