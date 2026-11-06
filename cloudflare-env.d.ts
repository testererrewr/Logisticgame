declare namespace Cloudflare {
  interface Env {
 SIMULATION_OWNER_EMAIL?: string;
    DB?: D1Database;
    ADMIN_EMAIL?: string;
    SIMULATION_OWNER_EMAIL?: string;
    ADMIN_SETUP_HASH?: string;
    CATALOG_PUSH_HASH?: string;
    BACKUP_READ_HASH?: string;
    BUCKET?: R2Bucket;
  }
}
