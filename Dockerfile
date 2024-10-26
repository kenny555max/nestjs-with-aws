# syntax = docker/dockerfile:1.2

# Use Node.js as the base image
FROM node:22.5.1-alpine3.20


# Install pnpm globally
RUN npm install -g pnpm

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and pnpm-lock.yaml to the working directory
COPY package.json pnpm-lock.yaml tsconfig.json  ./


# Install dependencies using pnpm
RUN pnpm install

# Copy application source code
COPY src/ ./src

# Build the application
RUN pnpm build

# Set environment variables for production
ENV NODE_ENV=production

# Expose the port on which the API will run
EXPOSE 3000

ENV PORT=3000

# Start the Express app
CMD ["pnpm", "start"]
