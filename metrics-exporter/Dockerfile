# GameCont Metrics Exporter — Sidecar Container
# Runs alongside each game server pod to scrape stats and expose to Prometheus.
# Image size: ~50 MB (Python 3.12 slim + prometheus_client)
#
# ⚠️ Memory usage: ~20 MB per instance. On t3.micro (1 GB RAM),
#    each game server pod uses this sidecar, limiting practical server count.

FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy exporter script
COPY exporter.py .

# Non-root user for security
RUN useradd -r -s /bin/false exporter
USER exporter

EXPOSE 9090

CMD ["python", "-u", "exporter.py"]
