/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly API_BASE_URL: string
  readonly APP_NAME: string
  readonly APP_VERSION: string
  readonly DEV_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
