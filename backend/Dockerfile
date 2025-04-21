# Use official Node.js 18 image with Alpine (smaller)
FROM node:18-alpine

# Create app directory inside container
WORKDIR /app

# Copy package files FIRST (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Copy your Firebase service account key
COPY serviceAccountKey.json ./serviceAccountKey.json

# Expose port 5000 (matches your backend port)
EXPOSE 5000

# Start the server
CMD ["node", "app.js"]
