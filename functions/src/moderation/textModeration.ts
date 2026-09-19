import {
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
} from 'obscenity';

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * 7.2 — baseline word-list check for name/bio (English only; Obscenity
 * ships no Russian dataset). Deliberately swappable: a real deployment
 * should also call a hosted moderation API (e.g. OpenAI Moderation) here
 * before trusting user-facing text, per the TZ's own suggestion.
 */
export function containsProfanity(text: string): boolean {
  return matcher.hasMatch(text);
}
