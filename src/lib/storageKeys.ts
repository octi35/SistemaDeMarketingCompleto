// Centralized localStorage keys to avoid scattered "magic strings".
export const STORAGE_KEYS = {
  geminiApiKey: "custom_gemini_api_key",
  anthropicApiKey: "custom_anthropic_api_key",

  linkedinClientId: "linkedin_client_id",
  linkedinClientSecret: "linkedin_client_secret",
  linkedinAccessToken: "linkedin_access_token",
  linkedinCode: "linkedin_code",

  metaClientId: "meta_client_id",
  metaClientSecret: "meta_client_secret",
  metaAccessToken: "meta_access_token",
  metaAdAccountId: "meta_ad_account_id",
  metaCode: "meta_code",
  metaIgAccountId: "meta_ig_account_id",
  metaPageId: "meta_page_id",

  driveFolderId: "custom_drive_folder_id",
  driveApiKey: "custom_drive_api_key",

  smtpHost: "smtp_host",
  smtpPort: "smtp_port",
  smtpUser: "smtp_user",
  smtpPass: "smtp_pass",

  calendarId: "custom_calendar_id",
  calendarApiKey: "custom_calendar_api_key",

  mediaLibrary: "adteam_media_library",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const getStored = (key: StorageKey): string =>
  (typeof localStorage !== "undefined" && localStorage.getItem(key)) || "";

export const setStored = (key: StorageKey, value: string): void => {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
};
