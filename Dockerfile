# AyazTrade Backend - Dev Mode
FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm install

# Expose port
EXPOSE 5000

# Start in dev mode (no build needed)
CMD ["npm", "run", "start:dev"]