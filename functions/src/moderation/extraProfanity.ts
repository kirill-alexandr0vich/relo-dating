import type { Data } from 'bad-words-next';

/**
 * Gaps found in the shipped dictionaries (bad-words-next `ru`/`ru_lat`)
 * while testing against the kind of text this audience actually writes.
 * Kept deliberately small and easy to extend — one place to add a word
 * when moderation misses something in production.
 *
 * Entries wrapped in `*` match as substrings (so inflected forms are
 * covered); the rest match as whole words only, which is what keeps
 * short Latin entries from firing inside unrelated words in other
 * languages.
 */
export const extraProfanityDictionary: Data = {
  id: 'relo_extra',
  // Symbol/letter substitutions ("n@huy") are handled per dictionary;
  // these entries are mostly Latin, where the shipped Cyrillic lookalike
  // map doesn't apply.
  lookalike: {},
  words: [
    // Russian typed in Latin letters — common when the keyboard has no
    // Cyrillic layout.
    'blyad',
    'blyat',
    'blya',
    'nahuy',
    'nahui',
    'naxuy',
    'pohuy',
    'pohui',
    'huy',
    'huj',
    'huynya',
    'huinya',
    'pizda',
    'dolboeb',
    'dolbaeb',
    'zaebal',
    'mudak',
    'gandon',
    'gondon',
    'pidor',
    // Cyrillic forms the shipped dictionary doesn't cover.
    '*мудак*',
    '*мудил*',
    '*гандон*',
    '*гондон*',
  ],
};
