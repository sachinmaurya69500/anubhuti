# Anubhuti

Full-stack internship submission portal for Dev Sanskriti Vishwavidyalaya.

## What's included

- Home page with hero section, live stats, and featured forms
- About DSVV page with institutional overview
- Forms page for student internship experience submissions
- Archive page with volume-based browsing and search
- Admin panel for managing forms, volumes, and submissions
- Real-time visitor analytics and submission insights
- PDF export for individual submissions

## Tech Stack

- **Frontend**: Vanilla JavaScript (app.js) with localStorage for visitor tracking
- **Backend**: Flask with MongoDB integration
- **Database**: MongoDB Atlas
- **Authentication**: JWT tokens with HTTP-only cookies
- **PDF Generation**: ReportLab

## Setup & Run

### Prerequisites
- Python 3.9+
- MongoDB Atlas connection string (free tier available)

### Installation

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your MongoDB Atlas connection details, admin credentials, and JWT secret.

### Run the server

```bash
python app.py
```

The app will be available at `http://localhost:3000`

## Features

- **Visitor Tracking**: Automatic page view logging with unique visitor IDs
- **Admin Dashboard**: Analytics showing total visitors and submissions by form
- **Student Submissions**: Form validation, deadline enforcement, PDF export capability
- **Admin Authentication**: Secure JWT-based login with 7-day session
- **MongoDB Integration**: All data persisted in MongoDB Atlas with automatic seeding

## API Endpoints

### Public
- `POST /api/visitors/track` - Log page visit
- `POST /api/submissions` - Student submission
- `GET /api/submissions/:id/pdf` - Download submission PDF

### Protected (Admin only)
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/analytics/visitors` - Visitor analytics
- `GET /api/analytics/submissions` - Submission stats
- `POST|GET|PUT|DELETE /api/forms` - Form management
- `POST|GET|PUT|DELETE /api/volumes` - Volume management

## Environment Variables

See `.env.example` for all required variables.