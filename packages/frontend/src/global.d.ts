/// <reference types="vite/client" />

/**
 * Global type augmentations for Claw Beacon.
 * Defines runtime config injected via public/config.js.
 */
interface Window {
  __CLAW_CONFIG__?: {
    API_URL?: string;
    BANKR_LLM_KEY?: string;
  };
}
