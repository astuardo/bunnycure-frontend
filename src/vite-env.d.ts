/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_WEB_PUSH_PUBLIC_KEY?: string;
}
