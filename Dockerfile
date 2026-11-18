FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin requests go through Nginx, never the visitor's localhost.
ENV NEXT_PUBLIC_ASSISTANT_API_URL=""
RUN npm run build

FROM python:3.11-slim-bookworm
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=8080 \
    WHISPER_PROVIDER=groq RAG_BACKEND=memory
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg nginx \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements-web.txt ./
RUN pip install --no-cache-dir -r requirements-web.txt
COPY core/ ./core/
COPY utils/ ./utils/
COPY main.py api_server.py ./
COPY deploy/ ./deploy/
COPY --from=frontend /build/out/ /app/frontend/out/
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /tmp/video-lens-client /tmp/video-lens-proxy /tmp/video-lens-fastcgi /tmp/video-lens-uwsgi /tmp/video-lens-scgi \
    && chown -R app:app /app /tmp/video-lens-client /tmp/video-lens-proxy /tmp/video-lens-fastcgi /tmp/video-lens-uwsgi /tmp/video-lens-scgi
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','8080')+'/api/health',timeout=4)"
CMD ["python", "deploy/start.py"]
