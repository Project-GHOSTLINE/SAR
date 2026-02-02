from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import hashlib

app = Flask(__name__)
CORS(app)

# Database setup
def init_db():
    conn = sqlite3.connect('metadata.db')
    c = conn.cursor()

    # Images metadata table
    c.execute('''CREATE TABLE IF NOT EXISTS image_metadata
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  hash_filename TEXT UNIQUE,
                  original_filename TEXT,
                  original_url TEXT,
                  downloaded_at TEXT,
                  file_size INTEGER,
                  width INTEGER,
                  height INTEGER,
                  format TEXT,
                  has_exif INTEGER DEFAULT 0,
                  exif_data TEXT,
                  gps_latitude REAL,
                  gps_longitude REAL,
                  gps_location TEXT,
                  camera_make TEXT,
                  camera_model TEXT,
                  taken_at TEXT,
                  user_tags TEXT,
                  user_comment TEXT,
                  rating INTEGER DEFAULT 0,
                  is_favorite INTEGER DEFAULT 0,
                  category TEXT,
                  source_site TEXT)''')

    conn.commit()
    conn.close()

init_db()

def extract_exif(image_path):
    """Extract EXIF data from image"""
    try:
        image = Image.open(image_path)
        exif_data = {}

        info = image._getexif()
        if info:
            for tag, value in info.items():
                decoded = TAGS.get(tag, tag)

                # Handle GPS data specially
                if decoded == "GPSInfo":
                    gps_data = {}
                    for t in value:
                        sub_decoded = GPSTAGS.get(t, t)
                        gps_data[sub_decoded] = value[t]
                    exif_data[decoded] = gps_data
                else:
                    exif_data[decoded] = str(value)

        # Get basic image info
        exif_data['Width'] = image.width
        exif_data['Height'] = image.height
        exif_data['Format'] = image.format

        return exif_data
    except Exception as e:
        print(f"Error extracting EXIF: {e}")
        return {}

def convert_gps_to_degrees(value):
    """Convert GPS coordinates to degrees"""
    d, m, s = value
    return d + (m / 60.0) + (s / 3600.0)

def get_gps_coordinates(gps_info):
    """Extract GPS coordinates from EXIF"""
    try:
        gps_latitude = gps_info.get('GPSLatitude')
        gps_latitude_ref = gps_info.get('GPSLatitudeRef')
        gps_longitude = gps_info.get('GPSLongitude')
        gps_longitude_ref = gps_info.get('GPSLongitudeRef')

        if gps_latitude and gps_longitude:
            lat = convert_gps_to_degrees(gps_latitude)
            lon = convert_gps_to_degrees(gps_longitude)

            if gps_latitude_ref == 'S':
                lat = -lat
            if gps_longitude_ref == 'W':
                lon = -lon

            return lat, lon
    except:
        pass
    return None, None

@app.route('/api/add-metadata', methods=['POST'])
def add_metadata():
    """Add metadata for an image"""
    data = request.json

    hash_filename = data.get('hash_filename')
    image_path = data.get('image_path')
    original_filename = data.get('original_filename')
    original_url = data.get('original_url')

    if not hash_filename or not image_path:
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        # Get file info
        file_size = os.path.getsize(image_path)

        # Extract EXIF
        exif_data = extract_exif(image_path)

        # GPS data
        gps_lat, gps_lon = None, None
        gps_location = None
        if 'GPSInfo' in exif_data:
            gps_lat, gps_lon = get_gps_coordinates(exif_data['GPSInfo'])
            if gps_lat and gps_lon:
                gps_location = f"{gps_lat:.6f}, {gps_lon:.6f}"

        # Camera info
        camera_make = exif_data.get('Make', '')
        camera_model = exif_data.get('Model', '')
        taken_at = exif_data.get('DateTime', '')

        # Image dimensions
        width = exif_data.get('Width', 0)
        height = exif_data.get('Height', 0)
        img_format = exif_data.get('Format', '')

        # Insert into database
        conn = sqlite3.connect('metadata.db')
        c = conn.cursor()

        c.execute('''INSERT OR REPLACE INTO image_metadata
                     (hash_filename, original_filename, original_url, downloaded_at,
                      file_size, width, height, format, has_exif, exif_data,
                      gps_latitude, gps_longitude, gps_location,
                      camera_make, camera_model, taken_at, source_site)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (hash_filename, original_filename, original_url, datetime.now().isoformat(),
                   file_size, width, height, img_format,
                   1 if exif_data else 0, str(exif_data),
                   gps_lat, gps_lon, gps_location,
                   camera_make, camera_model, taken_at,
                   data.get('source_site', '')))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'metadata': {
                'hash_filename': hash_filename,
                'original_filename': original_filename,
                'file_size': file_size,
                'dimensions': f"{width}x{height}",
                'has_gps': bool(gps_lat and gps_lon),
                'has_exif': bool(exif_data)
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-metadata/<hash_filename>', methods=['GET'])
def get_metadata(hash_filename):
    """Get metadata for an image"""
    conn = sqlite3.connect('metadata.db')
    c = conn.cursor()

    c.execute('SELECT * FROM image_metadata WHERE hash_filename = ?', (hash_filename,))
    row = c.fetchone()
    conn.close()

    if not row:
        return jsonify({'error': 'Not found'}), 404

    columns = ['id', 'hash_filename', 'original_filename', 'original_url', 'downloaded_at',
               'file_size', 'width', 'height', 'format', 'has_exif', 'exif_data',
               'gps_latitude', 'gps_longitude', 'gps_location', 'camera_make', 'camera_model',
               'taken_at', 'user_tags', 'user_comment', 'rating', 'is_favorite',
               'category', 'source_site']

    metadata = dict(zip(columns, row))
    return jsonify(metadata)

@app.route('/api/update-metadata/<hash_filename>', methods=['PUT'])
def update_metadata(hash_filename):
    """Update user metadata (tags, comment, rating, etc.)"""
    data = request.json

    conn = sqlite3.connect('metadata.db')
    c = conn.cursor()

    updates = []
    values = []

    if 'user_tags' in data:
        updates.append('user_tags = ?')
        values.append(data['user_tags'])

    if 'user_comment' in data:
        updates.append('user_comment = ?')
        values.append(data['user_comment'])

    if 'rating' in data:
        updates.append('rating = ?')
        values.append(data['rating'])

    if 'is_favorite' in data:
        updates.append('is_favorite = ?')
        values.append(1 if data['is_favorite'] else 0)

    if 'category' in data:
        updates.append('category = ?')
        values.append(data['category'])

    if updates:
        values.append(hash_filename)
        query = f"UPDATE image_metadata SET {', '.join(updates)} WHERE hash_filename = ?"
        c.execute(query, values)
        conn.commit()

    conn.close()

    return jsonify({'success': True})

@app.route('/api/search-metadata', methods=['POST'])
def search_metadata():
    """Search images by metadata"""
    data = request.json

    conn = sqlite3.connect('metadata.db')
    c = conn.cursor()

    query = 'SELECT * FROM image_metadata WHERE 1=1'
    params = []

    if data.get('has_gps'):
        query += ' AND gps_latitude IS NOT NULL'

    if data.get('camera_make'):
        query += ' AND camera_make LIKE ?'
        params.append(f"%{data['camera_make']}%")

    if data.get('min_width'):
        query += ' AND width >= ?'
        params.append(data['min_width'])

    if data.get('min_height'):
        query += ' AND height >= ?'
        params.append(data['min_height'])

    if data.get('category'):
        query += ' AND category = ?'
        params.append(data['category'])

    if data.get('is_favorite'):
        query += ' AND is_favorite = 1'

    if data.get('min_rating'):
        query += ' AND rating >= ?'
        params.append(data['min_rating'])

    if data.get('tags'):
        query += ' AND user_tags LIKE ?'
        params.append(f"%{data['tags']}%")

    query += ' ORDER BY downloaded_at DESC LIMIT 1000'

    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    columns = ['id', 'hash_filename', 'original_filename', 'original_url', 'downloaded_at',
               'file_size', 'width', 'height', 'format', 'has_exif', 'exif_data',
               'gps_latitude', 'gps_longitude', 'gps_location', 'camera_make', 'camera_model',
               'taken_at', 'user_tags', 'user_comment', 'rating', 'is_favorite',
               'category', 'source_site']

    results = [dict(zip(columns, row)) for row in rows]

    return jsonify({
        'count': len(results),
        'results': results
    })

@app.route('/api/all-metadata', methods=['GET'])
def get_all_metadata():
    """Get all metadata"""
    conn = sqlite3.connect('metadata.db')
    c = conn.cursor()

    limit = request.args.get('limit', 500)
    offset = request.args.get('offset', 0)

    c.execute(f'SELECT * FROM image_metadata ORDER BY downloaded_at DESC LIMIT ? OFFSET ?',
              (limit, offset))
    rows = c.fetchall()

    c.execute('SELECT COUNT(*) FROM image_metadata')
    total = c.fetchone()[0]

    conn.close()

    columns = ['id', 'hash_filename', 'original_filename', 'original_url', 'downloaded_at',
               'file_size', 'width', 'height', 'format', 'has_exif', 'exif_data',
               'gps_latitude', 'gps_longitude', 'gps_location', 'camera_make', 'camera_model',
               'taken_at', 'user_tags', 'user_comment', 'rating', 'is_favorite',
               'category', 'source_site']

    results = [dict(zip(columns, row)) for row in rows]

    return jsonify({
        'total': total,
        'count': len(results),
        'results': results
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get metadata statistics"""
    conn = sqlite3.connect('metadata.db')
    c = conn.cursor()

    c.execute('SELECT COUNT(*) FROM image_metadata')
    total = c.fetchone()[0]

    c.execute('SELECT COUNT(*) FROM image_metadata WHERE has_exif = 1')
    with_exif = c.fetchone()[0]

    c.execute('SELECT COUNT(*) FROM image_metadata WHERE gps_latitude IS NOT NULL')
    with_gps = c.fetchone()[0]

    c.execute('SELECT COUNT(*) FROM image_metadata WHERE is_favorite = 1')
    favorites = c.fetchone()[0]

    c.execute('SELECT AVG(rating) FROM image_metadata WHERE rating > 0')
    avg_rating = c.fetchone()[0] or 0

    c.execute('SELECT COUNT(DISTINCT category) FROM image_metadata WHERE category IS NOT NULL')
    categories = c.fetchone()[0]

    conn.close()

    return jsonify({
        'total_images': total,
        'with_exif': with_exif,
        'with_gps': with_gps,
        'favorites': favorites,
        'average_rating': round(avg_rating, 2),
        'categories_count': categories
    })

if __name__ == '__main__':
    print("""
╔═══════════════════════════════════════════════════════════╗
║  📊 METADATA MANAGER API                                  ║
╠═══════════════════════════════════════════════════════════╣
║  Server started on: http://localhost:5003                 ║
║                                                           ║
║  Features:                                                ║
║  • Extract EXIF data (GPS, camera, date)                  ║
║  • Store original filenames                               ║
║  • User tags & comments                                   ║
║  • Ratings & favorites                                    ║
║  • Advanced search                                        ║
║                                                           ║
║  Database: metadata.db                                    ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝
    """)
    app.run(debug=True, host='0.0.0.0', port=5003)
