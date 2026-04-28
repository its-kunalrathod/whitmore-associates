import http.server
import socketserver
import os

PORT = 3000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

os.chdir(r'D:\whitmore-associates')

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    print(f"Main site: http://localhost:{PORT}/index.html")
    print(f"Dashboard: http://localhost:{PORT}/dashboard/index.html")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()
