# Saves the canvas snapshots the play-test harness posts (T.snap in dev/playtest/harness.js) into dev/build/.
# Run: python dev/build/recv.py [port]    (default 8767, the port T.snap posts to)
# It only writes plain .png / .jpg names, only for pages served from this machine, and only up to 16 MB each,
# so a web page open in the same browser can't use it to overwrite the scripts in this folder.
import base64, http.server, os, re, sys
from urllib.parse import urlsplit

OUT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8767
MAX_BYTES = 16 * 1024 * 1024
NAME = re.compile(r'^[A-Za-z0-9_-]+\.(png|jpe?g)$')
LOCAL = re.compile(r'^http://(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$')


class H(http.server.BaseHTTPRequestHandler):
    def reply(self, code, body, origin=None):
        self.send_response(code)
        if origin:
            self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        origin = self.headers.get('Origin', '')
        if not LOCAL.match(origin):
            return self.reply(403, b'only pages served from this machine may post')
        name = urlsplit(self.path).path.strip('/')
        if not NAME.match(name):
            return self.reply(400, b'name must be a plain .png or .jpg file name', origin)
        try:
            size = int(self.headers.get('Content-Length', ''))
        except ValueError:
            size = 0
        if not 0 < size <= MAX_BYTES:
            return self.reply(413, b'body missing or over 16 MB', origin)
        data = self.rfile.read(size)
        if data.startswith(b'data:'):
            try:
                data = base64.b64decode(data.split(b',', 1)[1], validate=True)
            except (IndexError, ValueError):
                return self.reply(400, b'bad data URL', origin)
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(data)
        self.reply(200, b'ok', origin)

    def log_message(self, *a):
        pass


print(f'saving snapshots to {OUT} from http://127.0.0.1:{PORT}/')
http.server.HTTPServer(('127.0.0.1', PORT), H).serve_forever()
