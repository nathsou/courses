export interface Chapter {
  slug: string; number: number; title: string; subtitle: string; original: string;
  date: string; videoId: string; duration: number; minutes: number; question: string;
}
export const chapters: Chapter[] = [
  { slug: 'life-history', number: 1, title: 'A lifetime of energy', subtitle: 'Life history & reproduction', original: 'Histoire de vie et reproduction', date: '10 October 2017', videoId: 'aD-FSZnSchM', duration: 5586, minutes: 35, question: 'How can slow-growing humans support several dependent children at once?' },
  { slug: 'growing-a-brain', number: 2, title: 'Growing a costly brain', subtitle: 'Brains, birth & childhood', original: 'Grandir avec un grand cerveau', date: '24 October 2017', videoId: 'b5vIozqS40k', duration: 6147, minutes: 40, question: 'What does a fossil actually tell us about childhood?' },
  { slug: 'food', number: 3, title: 'The food that made us', subtitle: 'Diet & its evidence', original: 'Alimentation', date: '31 October 2017', videoId: '59iN7qmEk44', duration: 5614, minutes: 35, question: 'How do we reconstruct a meal that vanished thousands of years ago?' },
  { slug: 'bipedalism', number: 4, title: 'The price of a kilometre', subtitle: 'Walking, running & fossils', original: 'Le coût de la bipédie', date: '14 November 2017', videoId: '0ZlU1A0OQmc', duration: 5630, minutes: 35, question: 'What can the efficiency of walking explain about its evolution?' },
  { slug: 'temperature', number: 5, title: 'A body in a changing climate', subtitle: 'Heat, water & shelter', original: 'Thermorégulation', date: '21 November 2017', videoId: 'XkEhFRMi3xI', duration: 5083, minutes: 35, question: 'How much of a habitable climate do we carry—and how much do we make?' },
  { slug: 'niche-construction', number: 6, title: 'The environments we make', subtitle: 'Culture, cooperation & evolution', original: "L’évolution humaine : une construction de niche", date: '5 December 2017', videoId: 'OCoxju1dzCE', duration: 5435, minutes: 40, question: 'What happens when an organism changes the conditions of its own evolution?' }
];
export const figureIds = ['budget', 'sharing', 'brain', 'tooth', 'diet', 'processing', 'gait', 'fossils', 'heat', 'geometry', 'niche'] as const;
export type FigureId = typeof figureIds[number];
