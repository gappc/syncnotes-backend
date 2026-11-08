import { createTable, db, runStatement } from "../../persistence/db";
import { AuthReadSchema, AuthResponseSchema } from "./authSchema";

const tableName = "passkey";

// Create the table if it doesn't exist
const initPersistence = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id TEXT NOT NULL,
      publicKey BLOB NOT NULL,
      user_id INTEGER NOT NULL,
      webauthn_user_id TEXT NOT NULL,
      counter BIGINT NOT NULL,
      backup_eligible BOOLEAN NOT NULL,
      backed_status BOOLEAN NOT NULL,
      transports TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      device_type VARCHAR(32) NOT NULL,
      PRIMARY KEY (id),
      FOREIGN KEY (user_id) REFERENCES UserModel(id),
      UNIQUE (webauthn_user_id, user_id)
    );
  `;
  createTable(tableName, createTableQuery);

  runStatement(`
    CREATE INDEX IF NOT EXISTS idx_${tableName}_id ON ${tableName}(id);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_webauthn_user_id ON ${tableName}(webauthn_user_id);
  `);
};

// Get all passkeys from the database and validate the response using Zod
export const getAllPasskey = (): Promise<AuthResponseSchema[]> => {
  let selectQuery = `SELECT * FROM ${tableName}`;

  return new Promise<AuthResponseSchema[]>((resolve, reject) => {
    const passkeys: AuthResponseSchema[] = [];

    db.each(
      selectQuery,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          const parsed = AuthReadSchema.safeParse(row);
          if (!parsed.success) {
            reject(
              new Error("Invalid data format in the database: " + parsed.error)
            );
          } else {
            passkeys.push(parsed.data);
          }
        }
      },
      () => {
        resolve(passkeys);
      }
    );
  });
};

// Get passkeys by user ID and validate the response using Zod
export const getPasskeysByUserId = (
  userId: number
): Promise<AuthResponseSchema[]> => {
  const selectQuery = `SELECT * FROM ${tableName} WHERE user_id = ?`;

  return new Promise<AuthResponseSchema[]>((resolve, reject) => {
    const passkeys: AuthResponseSchema[] = [];

    db.each(
      selectQuery,
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          const parsed = AuthReadSchema.safeParse(row);
          if (!parsed.success) {
            reject(
              new Error("Invalid data format in the database: " + parsed.error)
            );
          } else {
            passkeys.push(parsed.data);
          }
        }
      },
      () => {
        resolve(passkeys);
      }
    );
  });
};

// Initialize the database and create the table
initPersistence();
