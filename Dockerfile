# Use a lightweight Node.js image
FROM node:26-alpine3.24

# Create app directory
WORKDIR /app

# Install the sync server (Hocuspocus + SQLite)
COPY sync/package.json sync/package-lock.json ./
RUN npm ci --omit=dev

# Node 26 runs the TypeScript sources directly (type stripping)
COPY sync/*.ts ./

# Make sure db exists
RUN mkdir -p /app/db

# Expose the port
EXPOSE 1234

# Set environment variables (can be overridden at runtime)
ENV SQLITE_DATABASE=/app/db/yjs-documents.sqlite
ENV HOST=0.0.0.0
ENV PORT=1234

CMD ["node", "server.ts"]
