/// <reference types="vite/client" />

// Build-time variables this app reads (see .env.example).
interface ImportMetaEnv {
  /** API base URL including the /api suffix. Falls back to http://localhost:3005/api. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
