# Use Node.js 20 as the base image
FROM node:20-alpine

# Add build argument for DATABASE_URL
ARG DATABASE_URL

# Set environment variable for runtime
ENV DATABASE_URL=${DATABASE_URL}

# Install OpenSSL, fonts and other required dependencies
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    python3 \
    make \
    g++ \
    pixman-dev \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    fontconfig \
    ttf-opensans \
    font-noto \
    font-noto-extra

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy prisma files
COPY src/prisma ./src/prisma/


# Copy the rest of the application
COPY . .

# Build the TypeScript application
RUN npm run build

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]