export const CURRENT_SCHEMA_VERSION = 1;

export interface Migration {
  fromVersion: number;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}

export const migrations: Migration[] = [];

export function migrateIfNeeded<T extends { schemaVersion: number }>(
  data: Record<string, unknown>,
): T {
  let current = { ...data };

  if (current.schemaVersion === undefined || current.schemaVersion === null) {
    current.schemaVersion = 0;
  }

  for (const migration of migrations) {
    if (migration.fromVersion === current.schemaVersion) {
      current = migration.migrate(current);
    }
  }

  current.schemaVersion = CURRENT_SCHEMA_VERSION;

  return current as T;
}
