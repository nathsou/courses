import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const base = process.env.BASE_PATH ?? (process.env.COURSES_BASE_PATH !== undefined ? `${process.env.COURSES_BASE_PATH}/human-evolution` : '');
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ pages: 'dist', assets: 'dist', strict: true }),
    paths: { base },
    prerender: {
      handleHttpError: ({ status, path, message }) => {
        // The collection index is built separately, outside this course's base.
        if (base && status === 404 && path === `${base.slice(0, base.lastIndexOf('/'))}/`) return;
        throw new Error(message);
      }
    }
  }
};
