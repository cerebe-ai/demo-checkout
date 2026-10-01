import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export interface Config {
  port: number;
  currency: string;
  sessionTtlSeconds: number;
  taxRateBasisPoints: number;
}

const here = dirname(fileURLToPath(import.meta.url));

export function loadConfig(): Config {
  const raw = readFileSync(join(here, "..", "config", "default.json"), "utf8");
  const parsed = JSON.parse(raw) as Partial<Config>;
  for (const key of ["port", "currency", "sessionTtlSeconds", "taxRateBasisPoints"] as const) {
    if (parsed[key] === undefined) throw new Error(`config: missing ${key}`);
  }
  return parsed as Config;
}
