export class BaseResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;

  constructor(success: boolean, message: string, data?: T, error?: any) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
  }

  static success<T>(data: T, message: string = 'Success') {
    return new BaseResponse<T>(true, message, data);
  }

  static error(message: string, error?: any) {
    return new BaseResponse<any>(false, message, undefined, error);
  }
}

export class PaginatedResponse<T> extends BaseResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
  };

  constructor(success: boolean, message: string, data: T[], meta: { page: number; limit: number; total: number }) {
    super(success, message, data);
    this.meta = meta;
  }

  static paginatedSuccess<T>(data: T[], meta: { page: number; limit: number; total: number }, message: string = 'Success') {
    return new PaginatedResponse<T>(true, message, data, meta);
  }
}
