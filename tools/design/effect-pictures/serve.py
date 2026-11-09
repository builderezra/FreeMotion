"""Local server for the effect-pictures site: static files, plus POST /shot?name=<n> which saves the PNG body to shots/<n>.png.
Run from the site folder: python3 serve.py 8791. Binds 127.0.0.1 only."""
import http.server, os, posixpath, re, sys, urllib.parse
REPO = '/home/ezra/FreeMotion'  # served READ-ONLY at /app/ so the real renderer can load (GET only; POST only ever writes under shots/)
ROOT = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(ROOT, 'shots')
os.makedirs(SHOTS, exist_ok=True)

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a):
        pass
    def translate_path(self, path):
        p = urllib.parse.urlparse(path).path
        if p.startswith('/app/'):
            rel = posixpath.normpath(urllib.parse.unquote(p[5:])).lstrip('/')
            if rel.startswith('..'):
                return '/nonexistent'
            return os.path.join(REPO, rel)
        return super().translate_path(path)
    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != '/shot':
            self.send_error(404); return
        name = urllib.parse.parse_qs(u.query).get('name', ['shot'])[0]
        name = re.sub(r'[^A-Za-z0-9_.-]', '_', name)[:80] or 'shot'
        n = int(self.headers.get('Content-Length', '0') or 0)
        if n <= 0 or n > 30_000_000:
            self.send_error(400); return
        data = self.rfile.read(n)
        p = os.path.join(SHOTS, name + '.png')
        with open(p, 'wb') as f:
            f.write(data)
        body = p.encode()
        self.send_response(200); self.send_header('Content-Type', 'text/plain'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
http.server.ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
