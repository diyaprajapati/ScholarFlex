FROM node:18-alpine

# Install netcat for database connection check
RUN apk add --no-cache netcat-openbsd

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Generate Prisma client inside the image
RUN npx prisma generate

EXPOSE 5000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
