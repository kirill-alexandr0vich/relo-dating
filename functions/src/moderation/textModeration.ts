import {
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
} from 'obscenity';
import BadWordsNext from 'bad-words-next';
import en from 'bad-words-next/lib/en';
import ru from 'bad-words-next/lib/ru';
import ruLat from 'bad-words-next/lib/ru_lat';
import ua from 'bad-words-next/lib/ua';
import es from 'bad-words-next/lib/es';
import fr from 'bad-words-next/lib/fr';
import de from 'bad-words-next/lib/de';
import pl from 'bad-words-next/lib/pl';
import { extraProfanityDictionary } from './extraProfanity';

/**
 * English, with obfuscation handling (spaced-out and leetspeak variants
 * that a plain word list misses).
 */
const englishMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * The other languages. Word lists alone would be too weak for inflected
 * languages — these dictionaries match stems, so forms nobody spelled out
 * ("блядью", "хуёвый") are still caught, as are symbol substitutions
 * ("н@хуй"). `ru_lat` covers Russian typed in Latin letters, which is
 * common among relocants writing from a non-Cyrillic keyboard.
 */
const multilingualMatcher = new BadWordsNext({ data: en });
[ru, ruLat, ua, es, fr, de, pl, extraProfanityDictionary].forEach(dictionary =>
  multilingualMatcher.add(dictionary),
);

/**
 * 7.2 — the check behind "имя" and "о себе" (see submitProfileText).
 * Those fields are public: they show up in strangers' feeds, so a slur
 * there is a product problem, and rejecting the save costs the author a
 * retype.
 *
 * Chat messages deliberately do NOT go through this. A profanity filter
 * between two people who already matched blocks ordinary adult
 * conversation while doing nothing about what actually goes wrong in a
 * chat — harassment, scams, minors — which is what reports, auto-hiding
 * and blocking are for (7.3/6.2).
 *
 * Still a dictionary, not a classifier: novel spellings get through. The
 * upgrade path is the hosted moderation API the TZ also suggests.
 */
export function containsProfanity(text: string): boolean {
  return englishMatcher.hasMatch(text) || multilingualMatcher.check(text);
}
