FROM python:3.10-slim

WORKDIR /app

# 1. Cài đặt các gói hệ thống TRƯỚC TIÊN
RUN apt-get update && apt-get install -y \
    build-essential \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Sao chép CHỈ file requirements.txt và cài đặt
# Bước này chỉ chạy lại khi bạn thay đổi file requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Sao chép toàn bộ code của bạn VÀO CUỐI CÙNG
# Bây giờ, khi bạn sửa code, chỉ có lớp này và các lớp sau nó bị ảnh hưởng
COPY . .

# Chạy ứng dụng
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]