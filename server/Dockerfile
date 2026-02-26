# Use Node.js 22 LTS
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDeps needed for TypeScript build)
RUN npm install

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
