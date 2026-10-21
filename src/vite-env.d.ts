/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API. Padrão: /api (proxy do Vite para o FastAPI em dev) */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
