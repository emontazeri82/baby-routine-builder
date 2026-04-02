export class ReminderValidationError extends Error {
  fieldErrors: Record<string, string[] | undefined>;

  constructor(message: string, fieldErrors: Record<string, string[] | undefined>) {
    super(message);
    this.name = "ReminderValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class ReminderDomainError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "ReminderDomainError";
    this.code = code;
  }
}

export function isReminderDomainError(error: unknown): error is ReminderDomainError {
  return error instanceof ReminderDomainError;
}

export function throwDomainError(code: string, message?: string): never {
  throw new ReminderDomainError(code, message);
}