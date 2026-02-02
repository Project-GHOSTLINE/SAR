from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import os
import json
import sqlite3
from pathlib import Path
import base64
from datetime import datetime
import numpy as np

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Create uploads directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Load OpenCV's pre-trained face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Database setup
def init_db():
    conn = sqlite3.connect('faces.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS images
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  filename TEXT,
                  path TEXT,
                  faces_count INTEGER,
                  indexed_at TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS faces
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  image_id INTEGER,
                  location TEXT,
                  size INTEGER,
                  FOREIGN KEY(image_id) REFERENCES images(id))''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    conn = sqlite3.connect('faces.db')
    c = conn.cursor()

    c.execute('SELECT COUNT(*) FROM images')
    total_images = c.fetchone()[0]

    c.execute('SELECT COUNT(*) FROM faces')
    total_faces = c.fetchone()[0]

    c.execute('SELECT filename, faces_count, indexed_at FROM images ORDER BY indexed_at DESC LIMIT 10')
    recent = [{'filename': row[0], 'faces': row[1], 'date': row[2]} for row in c.fetchall()]

    conn.close()

    return jsonify({
        'total_images': total_images,
        'total_faces': total_faces,
        'recent': recent
    })

@app.route('/api/scan', methods=['POST'])
def scan_directory():
    """Scan a directory for images and index faces"""
    data = request.json
    directory = data.get('directory')

    if not directory or not os.path.exists(directory):
        return jsonify({'error': 'Invalid directory'}), 400

    results = {
        'processed': 0,
        'faces_found': 0,
        'errors': []
    }

    conn = sqlite3.connect('faces.db')
    c = conn.cursor()

    # Supported image extensions
    extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}

    for root, dirs, files in os.walk(directory):
        for filename in files:
            if Path(filename).suffix.lower() not in extensions:
                continue

            filepath = os.path.join(root, filename)

            try:
                # Load image with OpenCV
                image = cv2.imread(filepath)
                if image is None:
                    continue

                # Convert to grayscale for face detection
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

                # Detect faces
                faces = face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=(30, 30)
                )

                # Insert image record
                c.execute('INSERT INTO images (filename, path, faces_count, indexed_at) VALUES (?, ?, ?, ?)',
                         (filename, filepath, len(faces), datetime.now().isoformat()))
                image_id = c.lastrowid

                # Insert face records
                for (x, y, w, h) in faces:
                    location_str = json.dumps({'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)})
                    size = int(w * h)
                    c.execute('INSERT INTO faces (image_id, location, size) VALUES (?, ?, ?)',
                             (image_id, location_str, size))

                results['processed'] += 1
                results['faces_found'] += len(faces)

            except Exception as e:
                results['errors'].append(f'{filename}: {str(e)}')

    conn.commit()
    conn.close()

    return jsonify(results)

@app.route('/api/search', methods=['POST'])
def search_face():
    """Search for images with faces (simplified version)"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # Save uploaded file
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(upload_path)

        # Load and detect faces in search image
        search_image = cv2.imread(upload_path)
        if search_image is None:
            return jsonify({'error': 'Could not load image'}), 400

        gray = cv2.cvtColor(search_image, cv2.COLOR_BGR2GRAY)
        search_faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        if len(search_faces) == 0:
            return jsonify({'error': 'No face found in uploaded image'}), 400

        # Get the largest face in search image
        (x, y, w, h) = max(search_faces, key=lambda f: f[2] * f[3])
        search_face_size = w * h

        # Search in database for images with similar face sizes
        conn = sqlite3.connect('faces.db')
        c = conn.cursor()
        c.execute('''SELECT DISTINCT i.id, i.filename, i.path, i.faces_count, f.size
                     FROM images i
                     JOIN faces f ON f.image_id = i.id
                     WHERE f.size > ? AND f.size < ?
                     ORDER BY ABS(f.size - ?) ASC
                     LIMIT 50''',
                  (search_face_size * 0.5, search_face_size * 2.0, search_face_size))

        matches = []
        for row in c.fetchall():
            img_id, filename, filepath, faces_count, face_size = row
            # Calculate similarity based on face size
            similarity = 100 * (1 - abs(face_size - search_face_size) / max(face_size, search_face_size))
            matches.append({
                'id': img_id,
                'filename': filename,
                'path': filepath,
                'faces_count': faces_count,
                'similarity': float(similarity)
            })

        conn.close()

        return jsonify({
            'matches_found': len(matches),
            'matches': matches,
            'note': 'Version simplifiée - recherche par taille de visage'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gallery', methods=['GET'])
def get_gallery():
    """Get all indexed images"""
    conn = sqlite3.connect('faces.db')
    c = conn.cursor()
    c.execute('SELECT id, filename, path, faces_count, indexed_at FROM images ORDER BY indexed_at DESC LIMIT 100')

    images = []
    for row in c.fetchall():
        images.append({
            'id': row[0],
            'filename': row[1],
            'path': row[2],
            'faces_count': row[3],
            'indexed_at': row[4]
        })

    conn.close()
    return jsonify({'images': images})

@app.route('/api/image/<path:filepath>')
def serve_image(filepath):
    """Serve an image file"""
    directory = os.path.dirname(filepath)
    filename = os.path.basename(filepath)
    return send_from_directory(directory, filename)

@app.route('/api/clear', methods=['POST'])
def clear_database():
    """Clear all indexed data"""
    conn = sqlite3.connect('faces.db')
    c = conn.cursor()
    c.execute('DELETE FROM faces')
    c.execute('DELETE FROM images')
    conn.commit()
    conn.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    print("""
╔═══════════════════════════════════════════════════════════╗
║  👤 IMAGE SEARCH DASHBOARD - Version Simplifiée           ║
╠═══════════════════════════════════════════════════════════╣
║  Server started on: http://localhost:5001                 ║
║                                                           ║
║  Features:                                                ║
║  • Scanner un dossier d'images (OpenCV)                   ║
║  • Détection de visages automatique                       ║
║  • Recherche par taille de visage                         ║
║  • Galerie d'images indexées                              ║
║                                                           ║
║  Note: Version simplifiée avec OpenCV                     ║
║  Plus rapide et compatible Python 3.14                    ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝
    """)
    app.run(debug=True, host='0.0.0.0', port=5001)
