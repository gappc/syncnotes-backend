# SyncNotes backend

This is the backend for SyncNotes, a note-taking app that syncs notes across devices.

## Sync server

The sync server is built with [Hocuspocus](https://tiptap.dev/docs/hocuspocus/introduction), a WebSocket backend for [Yjs](https://github.com/yjs/yjs). Documents are persisted in SQLite, using the SQLite client built into Node.js (`node:sqlite`, see [sync/document-store.ts](./sync/document-store.ts)). The table layout matches `@hocuspocus/extension-sqlite`. The code lives in [sync/](./sync), and it is packaged as a Docker container.

Configuration (environment variables):

- `PORT`: port to listen on (default `1234`)
- `HOST`: address to bind to (default `0.0.0.0`)
- `SQLITE_DATABASE`: path of the SQLite file (default `./db/yjs-documents.sqlite`, in Docker `/app/db/yjs-documents.sqlite`)

## Run

To run the backend, you need to have Docker installed. You can run the backend with the following command:

```bash
# Build the Docker image
docker build -t gappc/syncnotes-backend .

# Run the Docker container
docker run -p 1234:1234 -v ./db:/app/db gappc/syncnotes-backend
```

This will start the backend on port 1234 and store the data in `./db/yjs-documents.sqlite`.

You can also run the backend with Docker Compose:

```bash
# Build the Docker image
docker compose build

# Run the Docker container
docker compose up
```

To run it without Docker (Node.js 24 or newer runs the TypeScript sources directly):

```bash
cd sync
npm install
npm start
```

## Migrating from LevelDB (y-websocket)

Earlier versions used the y-websocket server with LevelDB persistence (`YPERSISTENCE`). The script [sync/migrate-leveldb.ts](./sync/migrate-leveldb.ts) copies all documents from a LevelDB directory into the SQLite database. It only reads the notes from LevelDB, and it merges into documents that already exist in SQLite, so running it twice is safe.

```bash
# 1. Stop the old server and back up the data
docker compose down
cp -a db db-backup-leveldb

# 2. Build the new image and run the migration (LevelDB files are in ./db)
docker compose build
docker compose run --rm y-websocket node migrate-leveldb.ts /app/db

# 3. Start the new server
docker compose up -d
```

The script lists every migrated document and its number of notes. The frontend uses the document name `syncnotes`; the script warns if no document with this name exists.

After checking that all notes are there, the old LevelDB files in `./db` (`*.ldb`, `*.log`, `CURRENT`, `LOCK`, `LOG*`, `MANIFEST-*`) and the `y-leveldb` dependency in `sync/package.json` can be removed. After that, the sync server has no native dependencies.
