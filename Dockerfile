# Dockerfile for Railway - builds the server from /server directory

# Use Node.js 22 LTS
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install ALL dependencies (prod + dev) so TypeScript build has all @types packages
RUN npm install

# Copy server source code
COPY server/tsconfig.json ./
COPY server/src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
