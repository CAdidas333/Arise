#!/usr/bin/env python3
"""Local preview server for Arise: threaded, with a deep listen backlog.

The stock `python3 -m http.server` resets connections when the page asks for its 14 scripts and 43 sound files at once.
  python3 tools/serve.py [PORT]      (default 8767, bound to 127.0.0.1, serves the repo root)
"""
import os, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


class Server(ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # never serve a stale page or script during testing
        super().end_headers()

    def log_message(self, *a):
        pass


Server(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8767), Handler).serve_forever()
