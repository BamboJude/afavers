# Dockerfile for Railway - builds the server from /server directory

# Use Node.js 22 LTS
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy server source code
COPY server/tsconfig.json ./
COPY server/src ./src

# Install dev dependencies for build
RUN npm install --save-dev typescript @types/node

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
