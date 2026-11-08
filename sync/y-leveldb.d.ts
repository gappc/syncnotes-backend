// y-leveldb ships types, but its package.json "exports" hides them.
// Only the methods used by migrate-leveldb.ts are declared here.
declare module "y-leveldb" {
  import type * as Y from "yjs";

  export class LeveldbPersistence {
    constructor(location: string);
    getAllDocNames(): Promise<string[]>;
    getYDoc(docName: string): Promise<Y.Doc>;
    destroy(): Promise<void>;
  }
}
