# Dockerfile.dev
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy all project files
COPY . .

# Start Vite dev server
CMD ["npm", "start"] 