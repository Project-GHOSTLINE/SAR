from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import os
from pathlib import Path
import hashlib
from datetime import datetime
import time
from concurrent.futures import ThreadPoolExecutor
import mimetypes

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

# Configuration
DOWNLOAD_FOLDER = 'scraped_images'
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# Store visited URLs to avoid duplicates
visited_urls = set()
downloaded_images = set()

def is_valid_url(url):
    """Check if URL is valid"""
    parsed = urlparse(url)
    return bool(parsed.netloc) and bool(parsed.scheme)

def get_all_images(url):
    """Extract all image URLs from a page"""
    try:
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        soup = BeautifulSoup(response.content, 'html.parser')

        images = []

        # Find all <img> tags
        for img in soup.find_all('img'):
            img_url = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
            if img_url:
                img_url = urljoin(url, img_url)
                if is_valid_url(img_url):
                    images.append(img_url)

        # Find images in CSS background
        for tag in soup.find_all(style=True):
            style = tag.get('style', '')
            if 'background-image' in style or 'background:' in style:
                # Extract URL from url(...)
                import re
                urls = re.findall(r'url\(["\']?(.*?)["\']?\)', style)
                for img_url in urls:
                    img_url = urljoin(url, img_url)
                    if is_valid_url(img_url):
                        images.append(img_url)

        return list(set(images))
    except Exception as e:
        print(f"Error getting images from {url}: {e}")
        return []

def get_all_links(url, base_domain):
    """Extract all links from a page (same domain only)"""
    try:
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        soup = BeautifulSoup(response.content, 'html.parser')

        links = []
        for a in soup.find_all('a', href=True):
            link = urljoin(url, a['href'])

            # Only follow links from the same domain
            if urlparse(link).netloc == base_domain:
                # Remove fragments and query params for deduplication
                link = link.split('#')[0].split('?')[0]
                if link not in visited_urls:
                    links.append(link)

        return links
    except Exception as e:
        print(f"Error getting links from {url}: {e}")
        return []

def download_image(img_url, output_folder):
    """Download a single image"""
    try:
        # Generate unique filename
        url_hash = hashlib.md5(img_url.encode()).hexdigest()[:12]

        # Get file extension
        ext = os.path.splitext(urlparse(img_url).path)[1]
        if not ext or len(ext) > 5:
            ext = '.jpg'

        filename = f"{url_hash}{ext}"
        filepath = os.path.join(output_folder, filename)

        # Skip if already downloaded
        if img_url in downloaded_images or os.path.exists(filepath):
            return {'url': img_url, 'status': 'skipped', 'reason': 'already_exists'}

        # Download
        response = requests.get(img_url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

        # Check if it's actually an image
        content_type = response.headers.get('Content-Type', '')
        if 'image' not in content_type and len(response.content) < 1000:
            return {'url': img_url, 'status': 'skipped', 'reason': 'not_an_image'}

        # Save file
        with open(filepath, 'wb') as f:
            f.write(response.content)

        downloaded_images.add(img_url)

        return {
            'url': img_url,
            'status': 'success',
            'filepath': filepath,
            'size': len(response.content)
        }

    except Exception as e:
        return {'url': img_url, 'status': 'error', 'error': str(e)}

def crawl_website(start_url, max_pages=50, max_images=500):
    """Crawl website and collect all images"""
    base_domain = urlparse(start_url).netloc

    results = {
        'start_url': start_url,
        'start_time': datetime.now().isoformat(),
        'pages_crawled': 0,
        'images_found': 0,
        'images_downloaded': 0,
        'images_failed': 0,
        'pages': [],
        'images': []
    }

    # Queue of URLs to visit
    to_visit = [start_url]
    visited_urls.clear()
    downloaded_images.clear()

    # Crawl pages
    while to_visit and results['pages_crawled'] < max_pages:
        url = to_visit.pop(0)

        if url in visited_urls:
            continue

        visited_urls.add(url)
        results['pages_crawled'] += 1

        print(f"[{results['pages_crawled']}/{max_pages}] Crawling: {url}")

        # Get images from this page
        images = get_all_images(url)
        results['images_found'] += len(images)

        page_info = {
            'url': url,
            'images_count': len(images),
            'images': images[:10]  # Store first 10 for reference
        }
        results['pages'].append(page_info)

        # Get more links to crawl
        if results['pages_crawled'] < max_pages:
            new_links = get_all_links(url, base_domain)
            to_visit.extend(new_links[:10])  # Limit new links per page

        # Download images from this page
        for img_url in images:
            if results['images_downloaded'] >= max_images:
                break

            result = download_image(img_url, DOWNLOAD_FOLDER)
            results['images'].append(result)

            if result['status'] == 'success':
                results['images_downloaded'] += 1
            elif result['status'] == 'error':
                results['images_failed'] += 1

        # Small delay to be respectful
        time.sleep(0.5)

    results['end_time'] = datetime.now().isoformat()

    return results

@app.route('/')
def index():
    return '''
    <html>
    <head>
        <title>Image Scraper API</title>
        <link rel="icon" type="image/svg+xml" href="/static/favicon.svg">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            // Suppress Tailwind CDN warning
            tailwind.config = { corePlugins: { preflight: false } }
        </script>
    </head>
    <body class="bg-gray-900 text-gray-100">
        <div class="container mx-auto px-4 py-8 max-w-4xl">
            <div class="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 mb-8">
                <h1 class="text-3xl font-bold mb-2">🕷️ Image Scraper API</h1>
                <p class="text-green-100">Scrape toutes les images d'un site web</p>
            </div>

            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
                <h2 class="text-xl font-bold mb-4">Tester le Scraper</h2>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">URL du Site</label>
                    <input type="text" id="url"
                           class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                           placeholder="https://example.com"
                           value="https://example.com">
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Pages Max</label>
                        <input type="number" id="maxPages"
                               class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                               value="10">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Images Max</label>
                        <input type="number" id="maxImages"
                               class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                               value="100">
                    </div>
                </div>

                <button onclick="startScrape()"
                        class="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition w-full">
                    🚀 Commencer le Scraping
                </button>

                <div id="results" class="mt-6 hidden">
                    <h3 class="text-lg font-bold mb-2">Résultats</h3>
                    <div id="progress" class="bg-gray-700 rounded-lg p-4 font-mono text-sm"></div>
                </div>
            </div>

            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 class="text-xl font-bold mb-4">📖 Documentation API</h2>

                <div class="space-y-4 text-sm">
                    <div>
                        <h3 class="font-bold text-green-400 mb-2">POST /api/scrape</h3>
                        <pre class="bg-gray-900 p-3 rounded overflow-x-auto">
curl -X POST http://localhost:5002/api/scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "max_pages": 10,
    "max_images": 100
  }'</pre>
                    </div>

                    <div>
                        <h3 class="font-bold text-blue-400 mb-2">Paramètres</h3>
                        <ul class="list-disc list-inside space-y-1 text-gray-400">
                            <li><code>url</code> - URL du site à scraper</li>
                            <li><code>max_pages</code> - Nombre max de pages (défaut: 50)</li>
                            <li><code>max_images</code> - Nombre max d'images (défaut: 500)</li>
                        </ul>
                    </div>

                    <div>
                        <h3 class="font-bold text-purple-400 mb-2">Dossier de Sortie</h3>
                        <p class="text-gray-400">Images sauvegardées dans: <code class="bg-gray-900 px-2 py-1 rounded">scraped_images/</code></p>
                    </div>
                </div>
            </div>
        </div>

        <script>
            async function startScrape() {
                const url = document.getElementById('url').value;
                const maxPages = parseInt(document.getElementById('maxPages').value);
                const maxImages = parseInt(document.getElementById('maxImages').value);

                document.getElementById('results').classList.remove('hidden');
                document.getElementById('progress').innerHTML = '⏳ Scraping en cours...';

                try {
                    const response = await fetch('/api/scrape', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, max_pages: maxPages, max_images: maxImages })
                    });

                    const data = await response.json();

                    if (data.error) {
                        document.getElementById('progress').innerHTML = `❌ Erreur: ${data.error}`;
                    } else {
                        document.getElementById('progress').innerHTML = `
                            ✅ Scraping terminé!<br><br>
                            📄 Pages crawlées: ${data.pages_crawled}<br>
                            🖼️ Images trouvées: ${data.images_found}<br>
                            ✅ Images téléchargées: ${data.images_downloaded}<br>
                            ❌ Échecs: ${data.images_failed}<br><br>
                            📁 Dossier: scraped_images/<br>
                            ⏱️ Temps: ${data.end_time}
                        `;
                    }
                } catch (error) {
                    document.getElementById('progress').innerHTML = `❌ Erreur: ${error.message}`;
                }
            }
        </script>
    </body>
    </html>
    '''

@app.route('/api/scrape', methods=['POST'])
def scrape():
    """API endpoint to scrape a website"""
    data = request.json

    url = data.get('url')
    max_pages = data.get('max_pages', 50)
    max_images = data.get('max_images', 500)

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    if not is_valid_url(url):
        return jsonify({'error': 'Invalid URL'}), 400

    print(f"\n🕷️ Starting scrape of {url}")
    print(f"   Max pages: {max_pages}, Max images: {max_images}\n")

    try:
        results = crawl_website(url, max_pages, max_images)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def stats():
    """Get scraper statistics"""
    if not os.path.exists(DOWNLOAD_FOLDER):
        return jsonify({'images_count': 0, 'folder_size': 0})

    images = os.listdir(DOWNLOAD_FOLDER)
    total_size = sum(os.path.getsize(os.path.join(DOWNLOAD_FOLDER, f))
                    for f in images if os.path.isfile(os.path.join(DOWNLOAD_FOLDER, f)))

    return jsonify({
        'images_count': len(images),
        'folder_size': total_size,
        'folder_size_mb': round(total_size / (1024 * 1024), 2),
        'folder_path': os.path.abspath(DOWNLOAD_FOLDER)
    })

@app.route('/api/list-images', methods=['GET'])
def list_images():
    """List all scraped images"""
    if not os.path.exists(DOWNLOAD_FOLDER):
        return jsonify({'images': []})

    images = [f for f in os.listdir(DOWNLOAD_FOLDER)
             if os.path.isfile(os.path.join(DOWNLOAD_FOLDER, f))
             and f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'))]

    # Sort by modification time (newest first)
    images.sort(key=lambda x: os.path.getmtime(os.path.join(DOWNLOAD_FOLDER, x)), reverse=True)

    return jsonify({'images': images})

@app.route('/scraped_images/<path:filename>')
def serve_scraped_image(filename):
    """Serve scraped images"""
    from flask import send_from_directory
    return send_from_directory(DOWNLOAD_FOLDER, filename)

if __name__ == '__main__':
    print("""
╔═══════════════════════════════════════════════════════════╗
║  🕷️ IMAGE SCRAPER API                                     ║
╠═══════════════════════════════════════════════════════════╣
║  Server started on: http://localhost:5002                 ║
║                                                           ║
║  Features:                                                ║
║  • Crawl tout un site web                                 ║
║  • Extraire toutes les images                             ║
║  • Télécharger automatiquement                            ║
║  • Support multi-pages                                    ║
║                                                           ║
║  Images sauvegardées dans: scraped_images/                ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝
    """)
    app.run(debug=True, host='0.0.0.0', port=5002)
