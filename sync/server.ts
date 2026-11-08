import { Database } from "@hocuspocus/extension-database";
import { Server } from "@hocuspocus/server";
import { openDocumentStore } from "./document-store.ts";

const port = Number(process.env.PORT ?? 1234);
const address = process.env.HOST ?? "0.0.0.0";
const database = process.env.SQLITE_DATABASE ?? "./db/yjs-documents.sqlite";

const documents = openDocumentStore(database);

const server = new Server({
  name: "syncnotes",
  port,
  address,
  extensions: [
    new Database({
      fetch: async ({ documentName }) => documents.load(documentName),
      store: async ({ documentName, state }) => documents.save(documentName, state),
    }),
  ],
});

await server.listen();
console.log(`Persisting documents to "${database}"`);
