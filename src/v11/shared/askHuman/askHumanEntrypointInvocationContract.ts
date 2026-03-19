export interface BuildAskHumanEntrypointInvocationInput {
  normalizedInput: {
    question: string;
    refs?: string[] | undefined;
    cwd?: string | undefined;
    now: Date;
  };
  createError: (message: string) => Error;
}
