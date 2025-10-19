# Stage 1: Build a Vite application
FROM node:20.19-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Chạy lệnh build của Vite, output sẽ nằm trong thư mục /dist
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine
RUN ls -la

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]