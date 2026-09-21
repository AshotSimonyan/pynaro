/**
 * Turning a failed auth call into something a form can render.
 *
 * Shared by sign-in and sign-up so the rule lives in one place: the server's
 * message is shown when the server is talking about the user's input, and
 * hidden when it is talking about itself. "Email or password is incorrect"
 * helps; "Something went wrong on our end (500)" does not, and putting it under
 * a password field sends people off to reset a password that was fine.
 */
import { isApiError } from "@/api";

export type AuthFormError = {
  /**
   * The input to mark, when the server named one. Null means the message
   * belongs to the form as a whole.
   */
  field: string | null;
  message: string;
};

export function authFormError(
  error: Error | null,
  fallback: string,
): AuthFormError | null {
  if (error === null) return null;
  if (!isApiError(error)) return { field: null, message: fallback };

  // 422 with a field: the server is describing the input, so it is quoted
  // verbatim and pinned to the input it names.
  if (error.code === "validation_failed") {
    return { field: error.field, message: error.message };
  }
  // 401: also about the input, in the only way an auth endpoint can be.
  if (error.status === 401) return { field: null, message: error.message };

  return { field: null, message: fallback };
}

/** The message for `field`, or undefined — which is what `Input`'s prop wants. */
export function errorFor(
  formError: AuthFormError | null,
  field: string,
): string | undefined {
  return formError?.field === field ? formError.message : undefined;
}
