export type ApiSuccess<T> = {
  success: true; statusCode: number; message: string; data: T;
  meta?: unknown; timestamp: string; path: string;
};

export type ApiFailure = {
  success: false; statusCode: number; error: string;
  message: string | string[]; timestamp?: string; path?: string;
};
