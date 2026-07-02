import urllib.request

urls = [
    'http://127.0.0.1:3000/api/books',
    'http://127.0.0.1:3000/api/admin/sales',
    'http://127.0.0.1:3000/api/admin/salesDetails'
]

for url in urls:
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            print(url, '->', r.status)
            data = r.read(200)
            if data:
                print(data.decode('utf-8', errors='replace'))
    except Exception as e:
        print(url, 'ERROR', type(e).__name__, e)
