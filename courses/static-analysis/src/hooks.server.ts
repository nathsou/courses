import type { HandleServerError } from '@sveltejs/kit';

/** Print server-side rendering errors with their stack (in dev and during prerendering). */
export const handleError: HandleServerError = ({ error }) => {
  console.error(error);
  return { message: error instanceof Error ? error.message : 'Internal Error' };
};
