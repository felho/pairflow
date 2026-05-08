export interface BubbleCommandsConfig {
  [commandId: string]: string | string[] | boolean | undefined;
  bootstrap?: string;
  lint?: string;
  test: string;
  typecheck: string;
  meta_review_approve_required?: string[];
  validation_required?: string[];
  validation_required_explicit?: true;
}
