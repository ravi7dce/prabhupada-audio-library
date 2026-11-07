import urllib.request
import re
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def fetch_folder_items(folder_id, resource_key=None, retries=3):
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    if resource_key:
        url += f"?resourcekey={resource_key}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as resp:
                html = resp.read().decode('utf-8', errors='ignore')

            prefix = "_DRIVE_ivd'] = '"
            pos = html.find(prefix)
            if pos == -1:
                return []
            
            start = pos + len(prefix)
            end = html.find("';", start)
            raw_val = html[start:end]
            decoded = re.sub(r'\\x([0-9a-fA-F]{2})', lambda m: chr(int(m.group(1), 16)), raw_val)
            data = json.loads(decoded)
            return data[0] if data and len(data) > 0 and isinstance(data[0], list) else []
        except Exception as e:
            time.sleep(1)
            if attempt == retries - 1:
                # print(f"Error fetching {folder_id}: {e}")
                return []
    return []

def process_item_raw(raw):
    # raw structure: [id, parents, name, mimeType, ...]
    file_id = raw[0]
    name = raw[2]
    mime = raw[3]
    size = raw[7] if len(raw) > 7 and isinstance(raw[7], (int, float)) else 0
    return {
        'id': file_id,
        'name': name,
        'mime': mime,
        'size': size
    }

def crawl_folder_recursive(folder_id, folder_name, depth=0, max_depth=3):
    raw_items = fetch_folder_items(folder_id)
    tracks = []
    subsections = []

    subfolders = []
    for raw in raw_items:
        item = process_item_raw(raw)
        if item['mime'] == 'application/vnd.google-apps.folder':
            subfolders.append(item)
        elif item['mime'].startswith('audio/') or item['name'].lower().endswith(('.mp3', '.m4a', '.wav', '.ogg', '.aac')):
            tracks.append({
                'id': item['id'],
                'title': item['name'],
                'size': item['size'],
                'mime': item['mime'],
                'streamUrl': f"https://drive.usercontent.google.com/download?id={item['id']}&export=download",
                'driveUrl': f"https://drive.google.com/file/d/{item['id']}/view"
            })

    # Sort tracks by natural filename order
    tracks.sort(key=lambda x: [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', x['title'])])

    if subfolders and depth < max_depth:
        # Sort subfolders naturally
        subfolders.sort(key=lambda x: [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', x['name'])])
        for sf in subfolders:
            sub_res = crawl_folder_recursive(sf['id'], sf['name'], depth + 1, max_depth)
            if sub_res['tracks'] or sub_res.get('subsections'):
                subsections.append(sub_res)

    return {
        'id': folder_id,
        'name': folder_name,
        'tracks': tracks,
        'subsections': subsections
    }

def main():
    with open('all_root_items.json', 'r', encoding='utf-8') as f:
        root_items = json.load(f)

    # Exclude root self-reference
    books_to_crawl = [b for b in root_items if b['id'] != '0B-PB2tbaaSPHa2Z6dXozNUZkUDA']
    print(f"Total books to crawl: {len(books_to_crawl)}")

    catalog = []
    total_tracks_count = 0

    # Crawl with thread pool for speed
    def crawl_worker(book):
        res = crawl_folder_recursive(book['id'], book['name'])
        return res

    start_time = time.time()
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(crawl_worker, book): book for book in books_to_crawl}
        completed = 0
        for future in as_completed(futures):
            completed += 1
            book_info = future.result()
            # Count tracks in this book (including subsections)
            def count_tracks(b):
                c = len(b.get('tracks', []))
                for s in b.get('subsections', []):
                    c += count_tracks(s)
                return c

            t_count = count_tracks(book_info)
            total_tracks_count += t_count
            catalog.append(book_info)
            if completed % 10 == 0 or completed == len(books_to_crawl):
                print(f"[{completed}/{len(books_to_crawl)}] Crawled '{book_info['name']}' ({t_count} tracks). Total tracks so far: {total_tracks_count}")

    # Sort catalog alphabetically by name
    catalog.sort(key=lambda x: x['name'].lower())

    elapsed = time.time() - start_time
    print(f"\nDone in {elapsed:.1f}s! Total books: {len(catalog)}, Total tracks: {total_tracks_count}")

    with open('catalog.json', 'w', encoding='utf-8') as f:
        json.dump({
            'updatedAt': time.strftime('%Y-%m-%d %H:%M:%S'),
            'totalBooks': len(catalog),
            'totalTracks': total_tracks_count,
            'books': catalog
        }, f, indent=2, ensure_ascii=False)
    print("Catalog saved to catalog.json")

if __name__ == '__main__':
    main()
