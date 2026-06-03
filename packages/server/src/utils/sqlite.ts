import { drizzle } from 'drizzle-orm/d1';
import * as schema from "../db/schema";

let db:
    | ReturnType<typeof createDb>
    | undefined;

function createDb(env: { nexus_db: D1Database }) {
    return drizzle(env.nexus_db, {
        schema,
        casing: "camelCase",
        logger: true,
    });
}

export function getDb(env: { nexus_db: D1Database }) {
    if (!db) {
        db = createDb(env);
    }

    return db;
}