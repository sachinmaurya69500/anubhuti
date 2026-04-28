import os
from datetime import datetime, timedelta
from functools import wraps
from io import BytesIO
import jwt
import bcrypt
from flask import Flask, jsonify, request, send_file, send_from_directory
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from dotenv import load_dotenv

load_dotenv()

# Configuration
PORT = int(os.getenv('PORT', 3000))
MONGODB_URI = os.getenv('MONGODB_URI')
JWT_SECRET = os.getenv('JWT_SECRET')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
ADMIN_NAME = os.getenv('ADMIN_NAME', 'Admin')
COOKIE_NAME = 'anubhuti_admin'
IS_PRODUCTION = os.getenv('NODE_ENV') == 'production'

# Validate configuration
for var, name in [(MONGODB_URI, 'MONGODB_URI'), (JWT_SECRET, 'JWT_SECRET'), 
                   (ADMIN_EMAIL, 'ADMIN_EMAIL'), (ADMIN_PASSWORD, 'ADMIN_PASSWORD')]:
    if not var:
        raise ValueError(f'Missing {name}. Check your .env file.')

app = Flask(__name__, static_folder='.', static_url_path='')

# Database setup
client = MongoClient(MONGODB_URI, server_api=ServerApi('1'))
db = client['anubhuti']
admins = db['adminusers']
forms = db['forms']
volumes = db['volumes']
submissions = db['submissions']
visitors = db['visitors']

def to_client(doc):
    """Convert MongoDB document to client format."""
    if not doc:
        return None
    doc['id'] = str(doc.pop('_id', ''))
    return doc

def seed_database():
    """Initialize database with admin and default collections."""
    try:
        pw_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        admins.update_one(
            {'email': ADMIN_EMAIL.lower()},
            {'$set': {'name': ADMIN_NAME, 'email': ADMIN_EMAIL.lower(), 'passwordHash': pw_hash}},
            upsert=True
        )
        
        if volumes.count_documents({}) == 0:
            volumes.insert_many([
                {
                    'volumeLabel': 'Volume I',
                    'year': '2024-25',
                    'publishedAt': '2025-03-20',
                    'description': 'Foundation entries capturing early internship reflections.',
                    'items': 4,
                    'createdAt': datetime.utcnow(),
                },
                {
                    'volumeLabel': 'Volume II',
                    'year': '2025-26',
                    'publishedAt': '2026-02-11',
                    'description': 'Internship experiences focused on skill-building.',
                    'items': 8,
                    'createdAt': datetime.utcnow(),
                },
            ])
        
        if forms.count_documents({}) == 0:
            forms.insert_many([
                {
                    'title': 'Summer Internship Experience 2026',
                    'category': 'Internship',
                    'deadline': '2026-06-15',
                    'description': 'Share your internship role, responsibilities, and reflections.',
                    'volumeId': '',
                    'status': 'active',
                    'submissionCount': 0,
                    'createdAt': datetime.utcnow(),
                },
                {
                    'title': 'Field Practice Reflection',
                    'category': 'Field Work',
                    'deadline': '2026-07-01',
                    'description': 'Share observations from practical field work.',
                    'volumeId': '',
                    'status': 'active',
                    'submissionCount': 0,
                    'createdAt': datetime.utcnow(),
                },
            ])
    except Exception as e:
        print(f'Seeding error: {e}')

def sign_token(user_id, email, name):
    """Generate JWT token."""
    payload = {
        'sub': str(user_id),
        'email': email,
        'name': name,
        'exp': datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_auth():
    """Verify JWT token from cookies."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user = admins.find_one({'_id': ObjectId(payload['sub'])})
        if not user:
            return None
        return {'id': str(user['_id']), 'name': user['name'], 'email': user['email']}
    except:
        return None

def require_auth(f):
    """Decorator for protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = verify_auth()
        if not user:
            return jsonify({'message': 'Authentication required.'}), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated

@app.route('/')
def serve_index():
    """Serve index.html."""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files."""
    if path.startswith('api/'):
        return jsonify({'message': 'Not found'}), 404
    return send_from_directory('.', path)

@app.route('/api/bootstrap', methods=['GET'])
def bootstrap():
    """Get initial app state."""
    try:
        user = verify_auth()
        forms_list = [to_client(f) for f in forms.find().sort('deadline', 1)]
        volumes_list = [to_client(v) for v in volumes.find().sort('publishedAt', 1)]
        submissions_list = [to_client(s) for s in submissions.find().sort('submittedAt', -1)]
        total_visitors = visitors.count_documents({})
        
        return jsonify({
            'user': user,
            'forms': forms_list,
            'volumes': volumes_list,
            'submissions': submissions_list,
            'totalVisitors': total_visitors,
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    """Get current auth status."""
    user = verify_auth()
    return jsonify({'user': user})

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Admin login."""
    try:
        data = request.get_json() or {}
        email = str(data.get('email', '')).strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'message': 'Email and password required.'}), 400
        
        user = admins.find_one({'email': email})
        if not user or not bcrypt.checkpw(password.encode(), user['passwordHash'].encode()):
            return jsonify({'message': 'Invalid admin credentials.'}), 401
        
        token = sign_token(user['_id'], user['email'], user['name'])
        response = jsonify({'user': {'id': str(user['_id']), 'email': user['email'], 'name': user['name']}})
        response.set_cookie(
            COOKIE_NAME,
            token,
            httponly=True,
            secure=IS_PRODUCTION,
            samesite='Lax',
            max_age=7 * 24 * 60 * 60,
        )
        return response
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    """Admin logout."""
    response = jsonify({'ok': True})
    response.delete_cookie(COOKIE_NAME, samesite='Lax')
    return response

@app.route('/api/visitors/track', methods=['POST'])
def track_visitor():
    """Track site visitor."""
    try:
        data = request.get_json() or {}
        visitor_id = request.headers.get('X-Visitor-Id', f'visitor-{int(datetime.utcnow().timestamp())}-{id(request)}')
        
        visitors.insert_one({
            'visitorId': visitor_id,
            'page': data.get('page', 'home'),
            'formId': data.get('formId', ''),
            'createdAt': datetime.utcnow(),
        })
        
        return jsonify({'visitorId': visitor_id})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/analytics/visitors', methods=['GET'])
@require_auth
def analytics_visitors():
    """Get visitor analytics."""
    try:
        total = visitors.count_documents({})
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        daily = list(visitors.aggregate([
            {'$match': {'createdAt': {'$gte': seven_days_ago}}},
            {'$group': {
                '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$createdAt'}},
                'count': {'$sum': 1},
            }},
            {'$sort': {'_id': 1}},
        ]))
        
        return jsonify({'totalVisitors': total, 'dailyVisitors': daily})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/analytics/submissions', methods=['GET'])
@require_auth
def analytics_submissions():
    """Get submission analytics."""
    try:
        forms_list = list(forms.find())
        submission_stats = list(submissions.aggregate([
            {'$group': {'_id': '$formId', 'count': {'$sum': 1}}},
        ]))
        
        data = []
        for form in forms_list:
            stats = next((s for s in submission_stats if s['_id'] == form['_id']), None)
            data.append({
                'formId': str(form['_id']),
                'title': form['title'],
                'count': stats['count'] if stats else 0,
            })
        
        return jsonify(data)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/forms', methods=['GET'])
@require_auth
def get_forms():
    """Get all forms."""
    try:
        forms_list = [to_client(f) for f in forms.find().sort('deadline', 1)]
        return jsonify(forms_list)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/forms', methods=['POST'])
@require_auth
def create_form():
    """Create form."""
    try:
        data = request.get_json() or {}
        if not all(k in data for k in ['title', 'category', 'deadline', 'description']):
            return jsonify({'message': 'Missing required fields.'}), 400
        
        doc = {
            'title': data['title'],
            'category': data['category'],
            'deadline': data['deadline'],
            'description': data['description'],
            'volumeId': data.get('volumeId', ''),
            'status': data.get('status', 'active'),
            'submissionCount': 0,
            'createdAt': datetime.utcnow(),
        }
        result = forms.insert_one(doc)
        doc['_id'] = result.inserted_id
        return jsonify(to_client(doc)), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/forms/<form_id>', methods=['PUT'])
@require_auth
def update_form(form_id):
    """Update form."""
    try:
        data = request.get_json() or {}
        result = forms.update_one(
            {'_id': ObjectId(form_id)},
            {'$set': data}
        )
        if result.matched_count == 0:
            return jsonify({'message': 'Form not found.'}), 404
        updated = forms.find_one({'_id': ObjectId(form_id)})
        return jsonify(to_client(updated))
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/forms/<form_id>', methods=['DELETE'])
@require_auth
def delete_form(form_id):
    """Delete form and linked submissions."""
    try:
        submissions.delete_many({'formId': ObjectId(form_id)})
        result = forms.delete_one({'_id': ObjectId(form_id)})
        if result.deleted_count == 0:
            return jsonify({'message': 'Form not found.'}), 404
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/volumes', methods=['GET'])
@require_auth
def get_volumes():
    """Get all volumes."""
    try:
        volumes_list = [to_client(v) for v in volumes.find().sort('publishedAt', -1)]
        return jsonify(volumes_list)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/volumes', methods=['POST'])
@require_auth
def create_volume():
    """Create volume."""
    try:
        data = request.get_json() or {}
        if not all(k in data for k in ['volumeLabel', 'year', 'publishedAt', 'description']):
            return jsonify({'message': 'Missing required fields.'}), 400
        
        doc = {
            'volumeLabel': data['volumeLabel'],
            'year': data['year'],
            'publishedAt': data['publishedAt'],
            'description': data['description'],
            'items': data.get('items', 0),
            'createdAt': datetime.utcnow(),
        }
        result = volumes.insert_one(doc)
        doc['_id'] = result.inserted_id
        return jsonify(to_client(doc)), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/volumes/<volume_id>', methods=['PUT'])
@require_auth
def update_volume(volume_id):
    """Update volume."""
    try:
        data = request.get_json() or {}
        result = volumes.update_one(
            {'_id': ObjectId(volume_id)},
            {'$set': data}
        )
        if result.matched_count == 0:
            return jsonify({'message': 'Volume not found.'}), 404
        updated = volumes.find_one({'_id': ObjectId(volume_id)})
        return jsonify(to_client(updated))
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/volumes/<volume_id>', methods=['DELETE'])
@require_auth
def delete_volume(volume_id):
    """Delete volume."""
    try:
        result = volumes.delete_one({'_id': ObjectId(volume_id)})
        if result.deleted_count == 0:
            return jsonify({'message': 'Volume not found.'}), 404
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions', methods=['GET'])
@require_auth
def get_submissions():
    """Get all submissions."""
    try:
        submissions_list = [to_client(s) for s in submissions.find().sort('submittedAt', -1)]
        return jsonify(submissions_list)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions', methods=['POST'])
def create_submission():
    """Create submission."""
    try:
        data = request.get_json() or {}
        required = ['formId', 'studentName', 'rollNumber', 'programme', 'organization', 'mentor', 'duration', 'summary']
        if not all(k in data for k in required):
            return jsonify({'message': 'Missing required fields.'}), 400
        
        form = forms.find_one({'_id': ObjectId(data['formId'])})
        if not form:
            return jsonify({'message': 'Form not found.'}), 404
        if form['status'] != 'active':
            return jsonify({'message': 'Form is not active.'}), 400
        if form['deadline'] < datetime.utcnow().strftime('%Y-%m-%d'):
            return jsonify({'message': 'Submission deadline passed.'}), 400
        
        doc = {
            'formId': ObjectId(data['formId']),
            'volumeId': data.get('volumeId', ''),
            'studentName': data['studentName'],
            'rollNumber': data['rollNumber'],
            'programme': data['programme'],
            'organization': data['organization'],
            'mentor': data['mentor'],
            'duration': data['duration'],
            'summary': data['summary'],
            'submittedAt': data.get('submittedAt', datetime.utcnow().strftime('%Y-%m-%d')),
            'createdAt': datetime.utcnow(),
        }
        result = submissions.insert_one(doc)
        forms.update_one({'_id': ObjectId(data['formId'])}, {'$inc': {'submissionCount': 1}})
        doc['_id'] = result.inserted_id
        return jsonify(to_client(doc)), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions/<submission_id>', methods=['PUT'])
@require_auth
def update_submission(submission_id):
    """Update submission."""
    try:
        data = request.get_json() or {}
        result = submissions.update_one(
            {'_id': ObjectId(submission_id)},
            {'$set': data}
        )
        if result.matched_count == 0:
            return jsonify({'message': 'Submission not found.'}), 404
        updated = submissions.find_one({'_id': ObjectId(submission_id)})
        return jsonify(to_client(updated))
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions/<submission_id>', methods=['DELETE'])
@require_auth
def delete_submission(submission_id):
    """Delete submission."""
    try:
        sub = submissions.find_one({'_id': ObjectId(submission_id)})
        if not sub:
            return jsonify({'message': 'Submission not found.'}), 404
        submissions.delete_one({'_id': ObjectId(submission_id)})
        forms.update_one({'_id': sub['formId']}, {'$inc': {'submissionCount': -1}})
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions/<submission_id>/pdf', methods=['GET'])
def download_pdf(submission_id):
    """Generate and download submission PDF."""
    try:
        sub = submissions.find_one({'_id': ObjectId(submission_id)})
        if not sub:
            return jsonify({'message': 'Submission not found.'}), 404
        
        form = forms.find_one({'_id': sub['formId']})
        volume = volumes.find_one({'_id': ObjectId(sub['volumeId'])}) if sub.get('volumeId') else None
        
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#0d5c46'), spaceAfter=6)
        story.append(Paragraph('Anubhuti', title_style))
        subtitle_style = ParagraphStyle('CustomSubtitle', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#66706a'))
        story.append(Paragraph('Dev Sanskriti Vishwavidyalaya internship submission export', subtitle_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Student info
        heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=18, textColor=colors.HexColor('#12241e'), spaceAfter=10)
        story.append(Paragraph(sub['studentName'], heading_style))
        
        info_data = [
            ['Roll number:', sub['rollNumber']],
            ['Programme:', sub['programme']],
            ['Organization:', sub['organization']],
            ['Mentor:', sub['mentor']],
            ['Duration:', sub['duration']],
            ['Submitted on:', sub['submittedAt']],
            ['Form:', form['title'] if form else 'Unknown'],
            ['Archive volume:', volume['volumeLabel'] if volume else 'Unassigned'],
        ]
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#12241e')),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Summary
        summary_heading = ParagraphStyle('SummaryHeading', parent=styles['Heading3'], fontSize=13, textColor=colors.HexColor('#12241e'), spaceAfter=8)
        story.append(Paragraph('Experience summary', summary_heading))
        summary_style = ParagraphStyle('SummaryText', parent=styles['Normal'], fontSize=10, leading=14, alignment=0)
        story.append(Paragraph(sub['summary'], summary_style))
        
        doc.build(story)
        buffer.seek(0)
        
        filename = f"anubhuti-{sub['rollNumber']}.pdf".replace('/', '-')
        return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

if __name__ == '__main__':
    seed_database()
    app.run(host='0.0.0.0', port=PORT, debug=False)
