export class BaseResponse<T> {
  Success: boolean;
  Message: string;
  Object?: T;
  Errors?: any[];

  constructor(Success: boolean, Message: string, Object?: T, Errors?: any[]) {
    this.Success = Success;
    this.Message = Message;
    this.Object = Object;
    this.Errors = Errors;
  }

  static success<T>(Object: T, Message: string = 'Success') {
    return new BaseResponse<T>(true, Message, Object);
  }

  static error(Message: string, Errors?: any | any[]) {
    const errorArray = Array.isArray(Errors) ? Errors : (Errors ? [Errors] : undefined);
    return new BaseResponse<any>(false, Message, undefined, errorArray);
  }
}

export class PaginatedResponse<T> extends BaseResponse<T[]> {
  PageNumber: number;
  PageSize: number;
  TotalSize: number;

  constructor(Success: boolean, Message: string, Object: T[], PageNumber: number, PageSize: number, TotalSize: number) {
    super(Success, Message, Object);
    this.PageNumber = PageNumber;
    this.PageSize = PageSize;
    this.TotalSize = TotalSize;
  }

  static paginatedSuccess<T>(Object: T[], PageNumber: number, PageSize: number, TotalSize: number, Message: string = 'Success') {
    return new PaginatedResponse<T>(true, Message, Object, PageNumber, PageSize, TotalSize);
  }
}
