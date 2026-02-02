#!/usr/bin/env python3
"""Unified Image Search Dashboard - All-in-One Server"""

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
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import hashlib
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time

app = Flask(__name__)
CORS(app)

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
SCRAPED_FOLDER = 'scraped_images'

# Create necessary directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(SCRAPED_FOLDER, exist_ok=True)

# Load OpenCV's pre-trained face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# ==================== DATABASE INITIALIZATION ====================

def init_databases():
    """Initialize both faces.db and metadata.db"""

    # Faces database
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

    # Metadata database
    conn = sqlite3.connect('metadata.db')
    c = conn.cursor()
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
                  source_site TEXT,
                  profile_url TEXT)''')
    conn.commit()
    conn.close()

init_databases()

# ==================== EXIF & METADATA FUNCTIONS ====================

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

# ==================== MAIN ROUTES ====================

@app.route('/')
def index():
    """Serve the main dashboard"""
    return send_from_directory('.', 'index.html')

@app.route('/osint.html')
def osint():
    """Serve the OSINT page"""
    return send_from_directory('.', 'osint.html')

# ==================== FACE SEARCH API ====================

@app.route('/api/face-stats', methods=['GET'])
def get_face_stats():
    """Get face search statistics"""
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

    extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}

    for root, dirs, files in os.walk(directory):
        for filename in files:
            if Path(filename).suffix.lower() not in extensions:
                continue

            filepath = os.path.join(root, filename)

            try:
                image = cv2.imread(filepath)
                if image is None:
                    continue

                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

                faces = face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=(30, 30)
                )

                c.execute('INSERT INTO images (filename, path, faces_count, indexed_at) VALUES (?, ?, ?, ?)',
                         (filename, filepath, len(faces), datetime.now().isoformat()))
                image_id = c.lastrowid

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
    """Search for images with faces"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(upload_path)

        search_image = cv2.imread(upload_path)
        if search_image is None:
            return jsonify({'error': 'Could not load image'}), 400

        gray = cv2.cvtColor(search_image, cv2.COLOR_BGR2GRAY)
        search_faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        if len(search_faces) == 0:
            return jsonify({'error': 'No face found in uploaded image'}), 400

        (x, y, w, h) = max(search_faces, key=lambda f: f[2] * f[3])
        search_face_size = w * h

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
            'matches': matches
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== SCRAPER API ====================

@app.route('/api/scraper-stats', methods=['GET'])
def get_scraper_stats():
    """Get scraper statistics"""
    if not os.path.exists(SCRAPED_FOLDER):
        return jsonify({'images_count': 0, 'total_size': 0})

    images = [f for f in os.listdir(SCRAPED_FOLDER)
             if os.path.isfile(os.path.join(SCRAPED_FOLDER, f))
             and f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'))]

    total_size = sum(os.path.getsize(os.path.join(SCRAPED_FOLDER, f)) for f in images)

    return jsonify({
        'images_count': len(images),
        'total_size': total_size
    })

@app.route('/api/list-images', methods=['GET'])
def list_images():
    """List all scraped images"""
    if not os.path.exists(SCRAPED_FOLDER):
        return jsonify({'images': []})

    images = [f for f in os.listdir(SCRAPED_FOLDER)
             if os.path.isfile(os.path.join(SCRAPED_FOLDER, f))
             and f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'))]

    images.sort(key=lambda x: os.path.getmtime(os.path.join(SCRAPED_FOLDER, x)), reverse=True)

    return jsonify({'images': images})

@app.route('/scraped_images/<path:filename>')
def serve_scraped_image(filename):
    """Serve scraped images"""
    return send_from_directory(SCRAPED_FOLDER, filename)

@app.route('/api/scrape-selenium', methods=['POST'])
def scrape_website_selenium():
    """Scrape images using Selenium (handles JavaScript)"""
    data = request.json
    url = data.get('url')
    max_pages = data.get('max_pages', 100)
    max_images = data.get('max_images', 1000)
    take_screenshots = data.get('screenshots', True)

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    downloaded = 0
    errors = []
    visited_urls = set()
    screenshots_taken = 0

    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Run in background
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

        def scrape_page_selenium(page_url):
            nonlocal downloaded, screenshots_taken

            if page_url in visited_urls or len(visited_urls) >= max_pages:
                return

            visited_urls.add(page_url)

            try:
                print(f"Loading page {len(visited_urls)}/{max_pages}: {page_url}")
                driver.get(page_url)

                # Wait for page to load (reduced for speed)
                time.sleep(2)

                # Take screenshot of the page
                if take_screenshots:
                    try:
                        screenshot_hash = hashlib.md5(page_url.encode()).hexdigest()
                        screenshot_path = os.path.join(SCRAPED_FOLDER, f"screenshot_{screenshot_hash}.png")
                        driver.save_screenshot(screenshot_path)
                        screenshots_taken += 1

                        # Add screenshot as metadata
                        add_metadata_internal_enhanced(
                            f"screenshot_{screenshot_hash}.png",
                            screenshot_path,
                            f"Screenshot of {urlparse(page_url).path}",
                            page_url,
                            urlparse(page_url).netloc,
                            page_url,
                            None,
                            driver.title,
                            "Full page screenshot"
                        )
                        print(f"Screenshot saved: {screenshot_path}")
                    except Exception as e:
                        print(f"Error taking screenshot: {e}")

                # Get page info
                page_title = driver.title
                page_data = {
                    'title': page_title,
                    'description': None,
                    'username': None
                }

                # Try to extract username from URL
                for pattern in ['/user/', '/profile/', '/u/', '/@', '/users/']:
                    if pattern in page_url:
                        parts = page_url.split(pattern)
                        if len(parts) > 1:
                            page_data['username'] = parts[1].split('/')[0].split('?')[0]
                            break

                # Find all images on page
                images = driver.find_elements(By.TAG_NAME, 'img')
                print(f"Found {len(images)} images on page")

                for img_element in images:
                    if downloaded >= max_images:
                        break

                    try:
                        # Get image URL (try multiple attributes)
                        img_url = img_element.get_attribute('src') or \
                                 img_element.get_attribute('data-src') or \
                                 img_element.get_attribute('data-lazy-src') or \
                                 img_element.get_attribute('data-original')

                        if not img_url or not img_url.startswith('http'):
                            continue

                        # Skip tiny images and common non-content images
                        if any(skip in img_url.lower() for skip in ['icon', 'logo', 'sprite', '1x1', 'pixel.gif']):
                            continue

                        # Download the image
                        response = requests.get(img_url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
                        if response.status_code == 200 and len(response.content) > 5000:  # Min 5KB
                            img_hash = hashlib.md5(response.content).hexdigest()
                            ext = img_url.split('.')[-1].split('?')[0][:4]
                            if ext not in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
                                ext = 'jpg'

                            filename = f"{img_hash}.{ext}"
                            filepath = os.path.join(SCRAPED_FOLDER, filename)

                            if not os.path.exists(filepath):
                                with open(filepath, 'wb') as f:
                                    f.write(response.content)

                                # Get alt text
                                alt_text = img_element.get_attribute('alt') or ''

                                # Add metadata
                                add_metadata_internal_enhanced(
                                    filename, filepath,
                                    img_url.split('/')[-1][:50],
                                    img_url,
                                    urlparse(page_url).netloc,
                                    page_url,
                                    page_data.get('username'),
                                    page_title,
                                    alt_text[:500] if alt_text else None
                                )

                                downloaded += 1
                                print(f"Downloaded: {filename} ({downloaded}/{max_images})")

                    except Exception as e:
                        errors.append(f"Image download error: {str(e)[:100]}")

                # Find links to other pages (optional - can be disabled for single page scraping)
                if downloaded < max_images and len(visited_urls) < max_pages:
                    links = driver.find_elements(By.TAG_NAME, 'a')
                    for link in links[:20]:  # Limit links to check
                        try:
                            href = link.get_attribute('href')
                            if href and urlparse(href).netloc == urlparse(page_url).netloc:
                                scrape_page_selenium(href)
                                if downloaded >= max_images:
                                    break
                        except:
                            pass

            except Exception as e:
                errors.append(f"Page error: {str(e)[:100]}")

        scrape_page_selenium(url)

        driver.quit()

        return jsonify({
            'success': True,
            'downloaded': downloaded,
            'screenshots': screenshots_taken,
            'pages_visited': len(visited_urls),
            'errors': errors[:10]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scrape', methods=['POST'])
def scrape_website():
    """Scrape images from a website"""
    data = request.json
    url = data.get('url')
    max_pages = data.get('max_pages', 10)
    max_images = data.get('max_images', 200)

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    downloaded = 0
    errors = []
    visited_urls = set()

    def download_image(img_url, source_url, page_data=None):
        nonlocal downloaded
        if downloaded >= max_images:
            return False

        try:
            response = requests.get(img_url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
            if response.status_code == 200:
                img_hash = hashlib.md5(response.content).hexdigest()
                ext = img_url.split('.')[-1].split('?')[0][:4]
                filename = f"{img_hash}.{ext}"
                filepath = os.path.join(SCRAPED_FOLDER, filename)

                if not os.path.exists(filepath):
                    with open(filepath, 'wb') as f:
                        f.write(response.content)

                    # Extract username from URL or page data
                    username = None
                    if page_data and page_data.get('username'):
                        username = page_data['username']
                    else:
                        # Try to extract username from URL patterns
                        for pattern in ['/user/', '/profile/', '/u/', '/@']:
                            if pattern in source_url:
                                parts = source_url.split(pattern)
                                if len(parts) > 1:
                                    username = parts[1].split('/')[0].split('?')[0]
                                    break

                    # Add metadata with enhanced information
                    try:
                        add_metadata_internal_enhanced(
                            filename, filepath,
                            img_url.split('/')[-1][:50],
                            img_url,
                            urlparse(source_url).netloc,
                            source_url,  # Page URL
                            username,
                            page_data.get('title') if page_data else None,
                            page_data.get('description') if page_data else None
                        )
                    except:
                        pass

                    downloaded += 1
                    return True
        except Exception as e:
            errors.append(str(e))
        return False

    def scrape_page(page_url):
        if page_url in visited_urls or len(visited_urls) >= max_pages:
            return

        visited_urls.add(page_url)

        try:
            response = requests.get(page_url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
            soup = BeautifulSoup(response.content, 'html.parser')

            # Extract page information
            page_data = {
                'title': None,
                'description': None,
                'username': None
            }

            # Get page title
            title_tag = soup.find('title')
            if title_tag:
                page_data['title'] = title_tag.get_text().strip()[:200]

            # Get meta description
            desc_tag = soup.find('meta', attrs={'name': 'description'}) or \
                      soup.find('meta', attrs={'property': 'og:description'})
            if desc_tag:
                page_data['description'] = desc_tag.get('content', '')[:500]

            # Try to find username in various ways
            # Look for common patterns in URL
            for pattern in ['/user/', '/profile/', '/u/', '/@', '/users/']:
                if pattern in page_url:
                    parts = page_url.split(pattern)
                    if len(parts) > 1:
                        page_data['username'] = parts[1].split('/')[0].split('?')[0]
                        break

            # Look for username in meta tags
            if not page_data['username']:
                author_tag = soup.find('meta', attrs={'name': 'author'}) or \
                            soup.find('meta', attrs={'property': 'profile:username'})
                if author_tag:
                    page_data['username'] = author_tag.get('content', '')

            # Download images with page context
            images_found = 0
            for img in soup.find_all('img'):
                if downloaded >= max_images:
                    break

                # Try multiple attributes for image URL
                img_url = (img.get('src') or img.get('data-src') or img.get('data-lazy-src') or
                          img.get('data-original') or img.get('data-srcset') or img.get('srcset'))

                if img_url:
                    # Handle srcset (take first URL)
                    if ' ' in str(img_url):
                        img_url = str(img_url).split(' ')[0].split(',')[0]

                    img_url = urljoin(page_url, str(img_url))
                    images_found += 1

                    # Filter out tiny images and icons
                    if any(skip in img_url.lower() for skip in ['icon', 'logo', 'sprite', 'pixel.gif', '1x1']):
                        continue

                    if img_url.startswith('http') and not img_url.endswith('.svg'):
                        # Get img alt text as additional context
                        if img.get('alt'):
                            page_data['description'] = img.get('alt')[:500]
                        print(f"Trying to download: {img_url[:100]}")
                        download_image(img_url, page_url, page_data)

            print(f"Found {images_found} images on {page_url}, downloaded {downloaded} so far")

            if downloaded < max_images:
                for link in soup.find_all('a', href=True):
                    next_url = urljoin(page_url, link['href'])
                    if urlparse(next_url).netloc == urlparse(page_url).netloc:
                        scrape_page(next_url)
                        if downloaded >= max_images:
                            break

        except Exception as e:
            errors.append(str(e))

    scrape_page(url)

    return jsonify({
        'success': True,
        'downloaded': downloaded,
        'pages_visited': len(visited_urls),
        'errors': errors[:10]
    })

# ==================== METADATA API ====================

def add_metadata_internal(hash_filename, image_path, original_filename, original_url, source_site):
    """Internal function to add metadata"""
    add_metadata_internal_enhanced(hash_filename, image_path, original_filename,
                                   original_url, source_site, None, None, None, None)

def add_metadata_internal_enhanced(hash_filename, image_path, original_filename,
                                   original_url, source_site, page_url=None,
                                   username=None, page_title=None, page_description=None):
    """Enhanced internal function to add metadata with additional fields"""
    try:
        file_size = os.path.getsize(image_path)
        exif_data = extract_exif(image_path)

        gps_lat, gps_lon = None, None
        gps_location = None
        if 'GPSInfo' in exif_data:
            gps_lat, gps_lon = get_gps_coordinates(exif_data['GPSInfo'])
            if gps_lat and gps_lon:
                gps_location = f"{gps_lat:.6f}, {gps_lon:.6f}"

        camera_make = exif_data.get('Make', '')
        camera_model = exif_data.get('Model', '')
        taken_at = exif_data.get('DateTime', '')

        width = exif_data.get('Width', 0)
        height = exif_data.get('Height', 0)
        img_format = exif_data.get('Format', '')

        # Build profile URL from username if available
        profile_url_final = None
        if username and source_site:
            # Try to construct profile URL based on common patterns
            if 'instagram' in source_site:
                profile_url_final = f"https://instagram.com/{username}"
            elif 'twitter' in source_site or 'x.com' in source_site:
                profile_url_final = f"https://twitter.com/{username}"
            elif 'onlyfans' in source_site:
                profile_url_final = f"https://onlyfans.com/{username}"
            elif username:
                profile_url_final = f"https://{source_site}/user/{username}"

        conn = sqlite3.connect('metadata.db')
        c = conn.cursor()

        c.execute('''INSERT OR REPLACE INTO image_metadata
                     (hash_filename, original_filename, original_url, downloaded_at,
                      file_size, width, height, format, has_exif, exif_data,
                      gps_latitude, gps_longitude, gps_location,
                      camera_make, camera_model, taken_at, source_site,
                      username, page_url, page_title, page_description, profile_url)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (hash_filename, original_filename, original_url, datetime.now().isoformat(),
                   file_size, width, height, img_format,
                   1 if exif_data else 0, str(exif_data),
                   gps_lat, gps_lon, gps_location,
                   camera_make, camera_model, taken_at, source_site,
                   username, page_url, page_title, page_description, profile_url_final))

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error adding metadata: {e}")

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
        file_size = os.path.getsize(image_path)
        exif_data = extract_exif(image_path)

        gps_lat, gps_lon = None, None
        gps_location = None
        if 'GPSInfo' in exif_data:
            gps_lat, gps_lon = get_gps_coordinates(exif_data['GPSInfo'])
            if gps_lat and gps_lon:
                gps_location = f"{gps_lat:.6f}, {gps_lon:.6f}"

        camera_make = exif_data.get('Make', '')
        camera_model = exif_data.get('Model', '')
        taken_at = exif_data.get('DateTime', '')

        width = exif_data.get('Width', 0)
        height = exif_data.get('Height', 0)
        img_format = exif_data.get('Format', '')

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
               'category', 'source_site', 'profile_url']

    metadata = dict(zip(columns, row))
    return jsonify(metadata)

@app.route('/api/update-metadata/<hash_filename>', methods=['PUT'])
def update_metadata(hash_filename):
    """Update user metadata"""
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
               'category', 'source_site', 'profile_url']

    results = [dict(zip(columns, row)) for row in rows]

    return jsonify({
        'total': total,
        'count': len(results),
        'results': results
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get combined statistics"""
    # Face stats
    conn = sqlite3.connect('faces.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM faces')
    total_faces = c.fetchone()[0]
    conn.close()

    # Metadata stats
    conn = sqlite3.connect('metadata.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM image_metadata')
    total_images = c.fetchone()[0]
    c.execute('SELECT COUNT(*) FROM image_metadata WHERE gps_latitude IS NOT NULL')
    with_gps = c.fetchone()[0]
    conn.close()

    # Scraper stats
    images_count = 0
    if os.path.exists(SCRAPED_FOLDER):
        images = [f for f in os.listdir(SCRAPED_FOLDER)
                 if os.path.isfile(os.path.join(SCRAPED_FOLDER, f))
                 and f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'))]
        images_count = len(images)

    return jsonify({
        'total_images': total_images,
        'total_faces': total_faces,
        'with_gps': with_gps,
        'images_count': images_count
    })

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
║  🎯 IMAGE SEARCH DASHBOARD - ALL-IN-ONE                   ║
╠═══════════════════════════════════════════════════════════╣
║  Server started on: http://localhost:8000                 ║
║                                                           ║
║  Features:                                                ║
║  • 👤 Face Detection & Search (OpenCV)                    ║
║  • 🕷️ Web Image Scraper                                   ║
║  • 📊 Metadata Manager (EXIF, GPS)                        ║
║  • 🖼️ Image Gallery                                       ║
║  • 🔍 OSINT Analysis                                      ║
║                                                           ║
║  All services combined into one server!                   ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝
    """)
    app.run(debug=True, host='0.0.0.0', port=8000)
