FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S botuser && \
    adduser -u 1001 -S botuser -G botuser

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/supabase ./supabase

# Install production dependencies only
RUN npm ci --production && \
    mkdir -p logs && \
    chown -R botuser:botuser /app

# Switch to non-root user
USER botuser

# Create volume for logs
VOLUME ["/app/logs"]

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]
