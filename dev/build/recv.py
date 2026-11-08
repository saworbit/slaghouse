import http.server, os, sys, base64
OUT = os.path.dirname(os.path.abspath(__file__))

class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        name = os.path.basename(self.path.strip('/')) or 'shot.jpg'
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if data.startswith(b'data:'):
            data = base64.b64decode(data.split(b',', 1)[1])
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'ok')
    def log_message(self, *a):
        pass

http.server.HTTPServer(('127.0.0.1', 8766), H).serve_forever()
