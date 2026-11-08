import { createTable, db } from "../../persistence/db";
import { UserReadSchema, UserResponseSchema } from "./userSchema";

const userTableName = "user";

// Create the table if it doesn't exist
const initPersistence = () => {
  const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS ${userTableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  createTable(userTableName, createUserTableQuery);
};

// Get all users from the database and validate the response using Zod
export const getAllUsers = (): Promise<UserResponseSchema[]> => {
  let selectQuery = `SELECT * FROM ${userTableName}`;

  return new Promise<UserResponseSchema[]>((resolve, reject) => {
    const users: UserResponseSchema[] = [];

    db.each(
      selectQuery,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          const parsed = UserReadSchema.safeParse(row);
          if (!parsed.success) {
            reject(
              new Error("Invalid data format in the database: " + parsed.error)
            );
          } else {
            users.push(parsed.data);
          }
        }
      },
      () => {
        resolve(users);
      }
    );
  });
};

// Get a user by ID and validate the response using Zod
export const getUserByUsername = (
  username: string
): Promise<UserResponseSchema | null> => {
  const selectQuery = `SELECT * FROM ${userTableName} WHERE username = ?`;

  return new Promise<UserResponseSchema | null>((resolve, reject) => {
    db.get(selectQuery, [username], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        resolve(null);
      } else {
        const parsed = UserReadSchema.safeParse(row);
        if (!parsed.success) {
          reject(
            new Error("Invalid data format in the database: " + parsed.error)
          );
        } else {
          resolve(parsed.data);
        }
      }
    });
  });
};

// Initialize the database and create the table
initPersistence();
