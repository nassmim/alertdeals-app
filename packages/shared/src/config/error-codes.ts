export enum EGeneralErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
export type TGeneralErrorCode = EGeneralErrorCode;

export enum EAccountErrorCode {
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
}
export type TAccountErrorCode = EAccountErrorCode;

export enum ESubscriptionErrorCode {
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  CHECKOUT_FAILED = 'CHECKOUT_FAILED',
  BILLING_PORTAL_FAILED = 'BILLING_PORTAL_FAILED',
  NO_ACTIVE_CUSTOMER = 'NO_ACTIVE_CUSTOMER',
}
export type TSubscriptionErrorCode = ESubscriptionErrorCode;

export enum EAlertErrorCode {
  ALERT_NOT_FOUND = 'ALERT_NOT_FOUND',
  ALERT_SAVE_FAILED = 'ALERT_SAVE_FAILED',
}
export type TAlertErrorCode = EAlertErrorCode;

export enum ESettingsErrorCode {
  SETTINGS_SAVE_FAILED = 'SETTINGS_SAVE_FAILED',
}
export type TSettingsErrorCode = ESettingsErrorCode;

export enum EWorkerErrorCode {
  CRON_DISPATCH_FAILED = 'CRON_DISPATCH_FAILED',
}
export type TWorkerErrorCode = EWorkerErrorCode;

export enum EWhatsAppErrorCode {
  RECIPIENT_PHONE_INVALID = 'RECIPIENT_PHONE_INVALID',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  SESSION_NOT_PAIRED = 'SESSION_NOT_PAIRED',
  SESSION_DECRYPT_FAILED = 'SESSION_DECRYPT_FAILED',
}
export type TWhatsAppErrorCode = EWhatsAppErrorCode;

export enum EAuthErrorCode {
  AUTH_ERROR = 'AUTH_ERROR',
  LINK_EXPIRED = 'LINK_EXPIRED',
  LINK_INVALID = 'LINK_INVALID',
  OAUTH_DENIED = 'OAUTH_DENIED',
  ACCOUNT_PENDING_VALIDATION = 'ACCOUNT_PENDING_VALIDATION',
  ACCOUNT_FETCH_FAILED = 'ACCOUNT_FETCH_FAILED',
}
export type TAuthErrorCode = EAuthErrorCode;

export type TErrorCode =
  | TGeneralErrorCode
  | TAccountErrorCode
  | TSubscriptionErrorCode
  | TAlertErrorCode
  | TSettingsErrorCode
  | TAuthErrorCode
  | TWorkerErrorCode
  | TWhatsAppErrorCode;
