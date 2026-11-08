/**
 * One-off migration: copy all Yjs documents from the old y-websocket LevelDB
 * storage (YPERSISTENCE) into the SQLite database used by the Hocuspocus server.
 *
 * Usage: node migrate-leveldb.ts <leveldb-dir> [sqlite-file]
 *
 * Stop the sync server before running it. Existing documents in SQLite are
 * merged (CRDT merge), not overwritten, so running it twice is safe.
 * Notes are only read from LevelDB (LevelDB itself may rewrite its own log
 * files when opened). Back up the directory anyway.
 */
import { LeveldbPersistence } from "y-leveldb";
import * as Y from "yjs";
import { openDocumentStore } from "./document-store.ts";

const [leveldbDir, sqliteFile = process.env.SQLITE_DATABASE ?? "./db/yjs-documents.sqlite"] =
  process.argv.slice(2);

if (!leveldbDir) {
  console.error("Usage: node migrate-leveldb.ts <leveldb-dir> [sqlite-file]");
  process.exit(1);
}

const leveldb = new LeveldbPersistence(leveldbDir);
const documents = openDocumentStore(sqliteFile);

const describe = (update: Uint8Array) => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, update);
  // SyncNotes keeps its notes in the Y.Array "notes"
  return doc.share.has("notes")
    ? `${doc.getArray("notes").length} notes`
    : `keys: ${[...doc.share.keys()].join(", ")}`;
};

try {
  const docNames = await leveldb.getAllDocNames();
  console.log(`Found ${docNames.length} document(s) in ${leveldbDir}`);

  for (const name of docNames) {
    const ydoc = await leveldb.getYDoc(name);
    const fromLeveldb = Y.encodeStateAsUpdate(ydoc);

    const existing = documents.load(name);
    const merged = existing ? Y.mergeUpdates([existing, fromLeveldb]) : fromLeveldb;

    documents.save(name, merged);
    console.log(
      `  "${name}" -> ${existing ? "merged into existing" : "created"} (${describe(merged)})`,
    );
  }

  if (docNames.length > 0 && !docNames.includes("syncnotes")) {
    console.warn(
      'Warning: no document named "syncnotes" found. The frontend uses this name. ' +
        "Check the names above.",
    );
  }
  console.log(`Done. SQLite database: ${sqliteFile}`);
} finally {
  await leveldb.destroy();
  documents.close();
}
