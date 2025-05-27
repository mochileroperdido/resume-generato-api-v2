# Resume Templates

This directory contains Word document templates for the resume generation API.

## Available Templates

1. **default-resume.docx**
   - A standard professional resume template
   - Clean and minimal design suitable for most industries
   - Balanced layout with clear sections

2. **professional-resume.docx**
   - Formal template designed for corporate and traditional industries
   - Structured layout emphasizing professional experience
   - Includes header with contact information, professional summary, experience, education, and skills sections

3. **creative-resume.docx**
   - Modern design for creative industries
   - More visual elements and modern typography
   - Suitable for design, marketing, and creative roles

4. **academic-resume.docx**
   - Comprehensive CV format for academic positions
   - Emphasizes publications, research, and teaching experience
   - Includes sections for grants, awards, and conferences

## Template Variables

Each template uses placeholders that will be replaced with actual content:

### Basic Information
- `{name}` - Full name
- `{email}` - Email address  
- `{phone}` - Phone number
- `{address}` - Physical address
- `{website}` - Personal website or portfolio URL
- `{linkedin}` - LinkedIn profile
- `{summary}` - Professional summary or objective statement

### Experience
Experience is handled as an array with the following structure:
```
{#experience}
{title} at {company}
{location}
{startDate} - {endDate}
{description}
{/experience}
```

### Education
Education is handled as an array with the following structure:
```
{#education}
{degree}
{institution}, {location}
Graduated: {year}
{/education}
```

### Skills
Skills can be formatted as a simple array:
```
{#skills}{.}{@index!==skills.length-1?, }{/skills}
```

### Additional Sections
Templates may include additional sections such as:
- `{#certifications}` - Professional certifications
- `{#projects}` - Notable projects
- `{#awards}` - Awards and recognitions
- `{#languages}` - Language proficiencies

## Creating New Templates

When creating new templates:

1. Create a new Word document
2. Insert placeholders using the syntax `{variableName}`
3. For arrays, use `{#arrayName}` to begin the section and `{/arrayName}` to end it
4. Save the document with a descriptive name in .docx format
5. Place it in this directory
6. Update the template mapping in the code to include your new template

## Placeholder Formatting

Text formatting (bold, italic, size, color) applied to placeholders will be preserved in the final document.