/// <reference types="vite/client" />

interface Window {
  monoFocus?: {
    notify: (title: string, body: string) => Promise<boolean>;
  };
}
