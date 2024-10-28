# syntax = docker/dockerfile:1.2

# syntax = docker/dockerfile:1.2
FROM node:20-alpine3.19

# Install pnpm using npm with additional dependencies
RUN apk add --no-cache libc6-compat \
    && npm install -g pnpm@8.15.1 \
    && pnpm config set store-dir ~/.pnpm-store

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and pnpm-lock.yaml to the working directory
COPY package.json pnpm-lock.yaml tsconfig.json  ./


# Install dependencies
RUN pnpm install --frozen-lockfile \
    && pnpm store prune

# Copy the rest of the source code
COPY src/ ./src/

# Add build error logging
RUN pnpm build || (echo "Build failed" && cat ~/.npm/_logs/*-debug.log && exit 1)

# Set environment variables for production
ENV NODE_ENV=production

# Expose the port on which the API will run
EXPOSE 3000

ENV PORT=3000

# Start the Express app
CMD ["pnpm", "start"]
