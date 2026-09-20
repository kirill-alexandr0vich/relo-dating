import { containsProfanity } from './textModeration';

describe('containsProfanity', () => {
  it.each([
    'I love hiking and coffee shops.',
    'Переехал в Тбилиси год назад, ищу компанию для хайкинга и кофе',
    'Люблю горы, вино и настольные игры. Работаю в IT, учу грузинский',
    'Ассистент в стартапе, играю в баскетбол по выходным',
    'Психолог, веду практику онлайн. Люблю медитацию и йогу',
    'Hola! Me encanta viajar y la comida georgiana',
    'Yeni taşındım, arkadaş arıyorum',
    'Анна',
    'Александр',
    'Giorgi',
  ])('passes ordinary profile text: %s', text => {
    expect(containsProfanity(text)).toBe(false);
  });

  it('flags an obvious English profanity', () => {
    expect(containsProfanity('fuck you')).toBe(true);
  });

  it('flags obfuscated English profanity', () => {
    expect(containsProfanity('f*ck you')).toBe(true);
    expect(containsProfanity('sh1t')).toBe(true);
  });

  // 7.2 — the audience is deliberately multilingual; an English-only
  // filter was a filter in name only.
  it.each([
    ['russian', 'иди нахуй'],
    ['russian, inflected form', 'блядью'],
    ['russian typed in latin letters', 'idi nahuy'],
    ['russian with a symbol substitution', 'н@хуй'],
    ['spanish', 'eres un cabron'],
    ['french', 'espèce de salope'],
    ['german', 'du arschloch'],
  ])('flags profanity in %s', (_language, text) => {
    expect(containsProfanity(text)).toBe(true);
  });

  it('ignores punctuation padding around a word', () => {
    expect(containsProfanity('сука!!!')).toBe(true);
  });

  it('does not flag an innocent word that merely contains a bad substring', () => {
    expect(containsProfanity('Страхую жизнь и здоровье')).toBe(false);
  });

  it('treats an empty value as clean', () => {
    expect(containsProfanity('')).toBe(false);
  });
});
