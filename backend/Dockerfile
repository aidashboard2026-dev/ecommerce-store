FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip first
RUN python -m pip install --upgrade pip

# Copy requirements first (better Docker cache)
COPY requirements.txt .

# Install Python dependencies with retries and longer timeout
RUN pip install \
    --default-timeout=300 \
    --retries=10 \
    --no-cache-dir \
    -r requirements.txt

# Copy application source
COPY . .

# Fix Windows line endings and make entrypoint executable
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]