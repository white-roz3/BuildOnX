FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Use PORT from Railway, default to 8000
ENV PORT=8000
EXPOSE 8000

# Start with shell to expand $PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
