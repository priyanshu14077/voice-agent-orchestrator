import { PostgresClient, type PostgresClientOptions, createPostgresClient } from "./client.js";
import {
  PostgresQueryBuilder,
  createQueryBuilder,
  type QueryBuilder,
  type CallRecord,
  type TranscriptRecord,
  type ActionRecord,
  type BorrowerRecord
} from "./queries.js";

export { PostgresClient, createPostgresClient } from "./client.js";
export type { PostgresClientOptions } from "./client.js";
export { PostgresQueryBuilder, createQueryBuilder } from "./queries.js";
export type { QueryBuilder, CallRecord, TranscriptRecord, ActionRecord, BorrowerRecord } from "./queries.js";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const getSchema = (): string => {
  return fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
};