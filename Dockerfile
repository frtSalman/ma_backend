# Dockerfile.dev
FROM node:22-alpine

# Set working directory
WORKDIR /

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .


CMD ["npm", "start"] 