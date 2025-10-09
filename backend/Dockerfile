# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update -y && apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ✅ Làm việc ở thư mục gốc dự án
WORKDIR /app

# ✅ Copy toàn bộ project (để backend nằm trong /app)
COPY . /app

# ✅ Khai báo PYTHONPATH để module backend được nhận diện
ENV PYTHONPATH=/app/backend:/app
# Cài requirements

RUN pip install --no-cache-dir -r /app/requirements.txt

EXPOSE 8000

# ✅ Chạy đúng FastAPI app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
