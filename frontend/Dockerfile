# Use Node.js LTS version as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json /app

# Install dependencies
RUN npm install
# RUN npm run build

# Start the development server
CMD ["npm", "start"]
