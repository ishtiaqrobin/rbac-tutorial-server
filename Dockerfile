FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for the build step)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ─── Production stage ─
FROM node:20-alpine

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Copy environment file
COPY .env ./.env

EXPOSE 5000

CMD ["node", "dist/server.js"]
