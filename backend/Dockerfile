FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Generate Prisma client inside the image
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
