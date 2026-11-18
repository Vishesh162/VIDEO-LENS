"""Run the public reverse proxy and private Python API in one container."""

import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def main():
    port = int(os.getenv("PORT", "8080"))
    if not 1 <= port <= 65535 or port == 8001:
        raise ValueError("PORT must be 1-65535 and different from the private API port 8001.")
    template = (ROOT / "deploy/nginx.conf").read_text()
    config = Path("/tmp/video-lens-nginx.conf")
    config.write_text(template.replace("__PORT__", str(port)))
    children = []

    def stop(*_):
        for child in children:
            if child.poll() is None:
                child.terminate()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        children.append(subprocess.Popen(
            [sys.executable, "api_server.py"], cwd=ROOT,
            env={**os.environ, "HOST": "127.0.0.1", "PORT": "8001"},
        ))
        children.append(subprocess.Popen(["nginx", "-p", "/tmp/", "-c", str(config), "-g", "daemon off;"]))
        while all(child.poll() is None for child in children):
            time.sleep(.5)
        return next((child.returncode for child in children if child.returncode is not None), 1)
    finally:
        stop()
        for child in children:
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == "__main__":
    sys.exit(main())
