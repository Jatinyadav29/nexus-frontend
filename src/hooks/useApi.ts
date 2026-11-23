import { api, type Api } from "../api";

/**
 * The typed API client (src/api). Kept as a hook so screens keep their
 * `useApi()` call; the client is a module singleton, so the returned object
 * is stable and safe as an effect dependency.
 */
const useApi = (): Api => api;

export default useApi;
