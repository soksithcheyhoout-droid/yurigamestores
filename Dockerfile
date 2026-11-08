FROM node:22-slim

WORKDIR /app

# Install all dependencies including build dependencies
COPY package*.json ./
RUN npm ci

# Copy full application source
COPY . .

# Compile Vite client production assets into dist/
RUN npm run build

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start YuriGame production server
CMD ["node", "server/server.js"]
