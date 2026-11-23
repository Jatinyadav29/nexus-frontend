/// <reference types="vite/client" />

// Build-time variables this app reads (see .env.example).
interface ImportMetaEnv {
  /** API base URL including the /api suffix. Falls back to http://localhost:3005/api. */
  readonly VITE_API_BASE_URL?: string;
  /**
   * Origin of the live chat Socket.IO server (the Render service), e.g.
   * https://nexus-api.example.com. Falls back to the origin of
   * VITE_API_BASE_URL when that is absolute, else http://localhost:3005.
   */
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
