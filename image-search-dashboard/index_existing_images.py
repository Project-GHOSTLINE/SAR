#!/usr/bin/env python3
"""Index all existing images with metadata"""

import requests
import os
from pathlib import Path

SCRAPED_FOLDER = "/Users/xunit/Desktop/📁 Projets/sar/image-search-dashboard/scraped_images"
METADATA_API = "http://localhost:5003/api/add-metadata"

def index_all_images():
    """Index all images in scraped_images folder"""
    if not os.path.exists(SCRAPED_FOLDER):
        print(f"❌ Folder not found: {SCRAPED_FOLDER}")
        return

    images = [f for f in os.listdir(SCRAPED_FOLDER)
             if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'))]

    print(f"📊 Found {len(images)} images to index\n")

    indexed = 0
    errors = 0

    for i, filename in enumerate(images, 1):
        filepath = os.path.join(SCRAPED_FOLDER, filename)

        try:
            response = requests.post(METADATA_API, json={
                'hash_filename': filename,
                'image_path': filepath,
                'original_filename': filename,  # We only have hash name
                'original_url': 'unknown',
                'source_site': 'scraped'
            }, timeout=5)

            if response.status_code == 200:
                data = response.json()
                metadata = data.get('metadata', {})
                dims = metadata.get('dimensions', '')
                has_gps = '📍' if metadata.get('has_gps') else '  '
                has_exif = '📸' if metadata.get('has_exif') else '  '

                print(f"[{i}/{len(images)}] ✅ {has_gps}{has_exif} {filename[:30]:<30} {dims}")
                indexed += 1
            else:
                print(f"[{i}/{len(images)}] ⚠️  {filename} - Error: {response.status_code}")
                errors += 1

        except Exception as e:
            print(f"[{i}/{len(images)}] ❌ {filename} - {str(e)}")
            errors += 1

        # Progress every 100 images
        if i % 100 == 0:
            print(f"\n📊 Progress: {i}/{len(images)} ({(i/len(images)*100):.1f}%)\n")

    print(f"\n{'='*60}")
    print(f"✅ Indexing complete!")
    print(f"   Indexed: {indexed}")
    print(f"   Errors: {errors}")
    print(f"   Total: {len(images)}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    print("""
╔═══════════════════════════════════════════════════════════╗
║  📊 INDEXING EXISTING IMAGES                              ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  This will extract metadata from all images in:           ║
║  scraped_images/                                          ║
║                                                           ║
║  Metadata extracted:                                      ║
║  • EXIF data (camera, date, GPS)                          ║
║  • Dimensions & file size                                 ║
║  • Format & quality                                       ║
║                                                           ║
║  Starting in 3 seconds...                                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    """)

    import time
    time.sleep(3)

    index_all_images()
