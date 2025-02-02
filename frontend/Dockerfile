# Use Node.js LTS version as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json /app

# Install dependencies
RUN npm ci

# Start the development server
CMD ["npm", "start"]
