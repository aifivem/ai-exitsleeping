// Generated from sql/main.sql by aicore-db-types (the build runs it). Do not edit: change the SQL and build.

/** Row of each table as @aicore-fivem/mysql returns it. */
export type Tables = {
  ai_exitsleeping_sleepers: {
    char_id: number;
    model: string;
    anim: number;
    x: number;
    y: number;
    z: number;
    heading: number;
    logged_out_at: number;
  };
};

/** What an INSERT needs: columns with a default, NULL or AUTO_INCREMENT may be left out. */
export type TableInserts = {
  ai_exitsleeping_sleepers: {
    char_id: number;
    model: string;
    anim?: number;
    x: number;
    y: number;
    z: number;
    heading: number;
    logged_out_at: number;
  };
};
