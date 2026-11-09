# Use a lightweight Node.js image - pinned by tag and index digest, fully qualified
# (built by deploy, hosting plan v0.3b; podman on the servers has no short names)
FROM docker.io/library/node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS app

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
