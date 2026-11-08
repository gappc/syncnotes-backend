import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Same table layout as @hocuspocus/extension-sqlite, so a database file
// created with that extension keeps working.
const schema = `CREATE TABLE IF NOT EXISTS "documents" (
  "name" varchar(255) NOT NULL,
  "data" blob NOT NULL,
  UNIQUE(name)
)`;

const selectQuery = `SELECT data FROM "documents" WHERE name = $name`;

const upsertQuery = `
  INSERT INTO "documents" ("name", "data") VALUES ($name, $data)
    ON CONFLICT(name) DO UPDATE SET data = $data
`;

/**
 * Stores one Yjs document state (an encoded update) per document name,
 * using the SQLite client built into Node.js.
 */
export const openDocumentStore = (file: string) => {
  // SQLite does not create missing directories
  if (file !== ":memory:" && file !== "") {
    mkdirSync(dirname(file), { recursive: true });
  }

  const db = new DatabaseSync(file);
  db.exec(schema);

  const select = db.prepare(selectQuery);
  const upsert = db.prepare(upsertQuery);

  return {
    load(name: string): Uint8Array | null {
      const row = select.get({ name }) as { data: Uint8Array } | undefined;
      return row?.data ?? null;
    },
    save(name: string, data: Uint8Array) {
      upsert.run({ name, data });
    },
    close() {
      db.close();
    },
  };
};
