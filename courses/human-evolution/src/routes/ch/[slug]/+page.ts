import { error } from '@sveltejs/kit';
import { lessons } from '$lib/content';
export function entries() { return lessons.map(x => ({ slug: x.slug })); }
export function load({ params }: { params: { slug: string } }) {
  const chapter = lessons.find(x => x.slug === params.slug);
  if (!chapter) error(404, 'Chapter not found');
  return { chapter };
}
