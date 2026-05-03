export interface UiApiErrorBody {
  error: {
    code: "bad_request" | "not_found" | "conflict" | "internal_error";
    message: string;
    details?: Record<string, unknown>;
  };
}
