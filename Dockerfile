# Use a lightweight Node.js image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Make sure db exists
RUN mkdir -p /app/db

# Initialize a new Node.js project. It is required to run y-websocket
RUN npm init -y

# Install y-websocket and @y/websocket-server
RUN npm install --save y-websocket @y/websocket-server

# Expose the port
EXPOSE 1234

# Set environment variables (can be overridden at runtime)
ENV YPERSISTENCE=/app/db
ENV HOST=0.0.0.0
ENV PORT=1234

# Command to run y-websocket
CMD ["npx", "y-websocket"]
