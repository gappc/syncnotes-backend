# SyncNotes backend

This is the backend for SyncNotes, a note-taking app that syncs notes across devices.

## Run

The backend is built with [y-websocket](https://github.com/yjs/y-websocket) [@y/websocket-server](https://github.com/yjs/y-websocket-server/), packaged as a Docker container.

To run the backend, you need to have Docker installed. You can run the backend with the following command:

```bash
# Build the Docker image
docker build -t gappc/syncnotes-backend .

# Run the Docker container
docker run -e PORT=1234 -e HOST=0.0.0.0 -e YPERSISTENCE=/db -p 1234:1234 -v ./db:/data gappc/syncnotes-backend
```

This will start the backend on port 1234 and store the data in the `./db` directory. You can change the port and data directory as needed.

You can also run the backend with Docker Compose. To do this, you need to have Docker Compose installed. You can run the backend with the following command:

```bash
# Build the Docker image
docker-compose build

# Run the Docker container
docker-compose up
```
