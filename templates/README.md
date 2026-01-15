# BuildOnX Templates

These are the starter templates used by BuildOnX when generating projects.

## Available Templates

### 1. Static Site (`static-site/`)
A vanilla HTML/CSS/JS template with a modern dark theme. Perfect for:
- Landing pages
- Portfolio sites
- Simple content sites
- Marketing pages

### 2. React App (`react-app/`)
A React application using CDN-loaded React and Babel. Features:
- React 18 with hooks
- Tailwind CSS for styling
- No build step required
- Great for interactive apps

### 3. Dashboard (`dashboard/`)
A data visualization template with Chart.js. Includes:
- Sidebar navigation
- Stats cards
- Line and doughnut charts
- Dark theme optimized for data

### 4. API Backend (`api-backend/`)
A FastAPI Python application. Features:
- RESTful API endpoints
- Pydantic models
- Auto-generated OpenAPI docs
- CORS support

## Template Variables

Templates use these placeholders that get replaced during generation:
- `{{PROJECT_NAME}}` - The project's name
- `{{PROJECT_DESCRIPTION}}` - The project's description

## Usage

These templates are used as base structures when the AI generates projects. The AI will customize and expand upon these templates based on the user's specific requirements.


