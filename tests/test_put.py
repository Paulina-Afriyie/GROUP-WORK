import urllib.request
import urllib.error
import json

def do_get(path):
    url = 'http://127.0.0.1:3000' + path
    print('GET', url)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as r:
        print('status', r.status)
        print('headers', r.getheaders())
        body = r.read().decode('utf-8')
        print('body', body[:400])


def do_put(path, payload):
    url = 'http://127.0.0.1:3000' + path
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='PUT')
    req.add_header('Content-Type', 'application/json')
    print('PUT', url)
    try:
        with urllib.request.urlopen(req) as r:
            print('status', r.status)
            print('body', r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print('status', e.code)
        print('body', e.read().decode('utf-8'))

if __name__ == '__main__':
    do_get('/api/admin/products')
    do_put('/api/admin/products/1', {
        'product_name': 'Test Update Fix',
        'product_author': 'Tester',
        'product_price': '10.99',
        'product_quantity_in_stock': '5',
        'supplier_ID': '',
        'category_ID': '',
        'product_image': ''
    })
