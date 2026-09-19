const MONTHS_BACK = 60;

/** Options for the "здесь с" (3.2) picker: the last 5 years, newest first, as `YYYY-MM` values. */
export function getHereSinceOptions(
  locale: string,
  now: Date = new Date(),
): { code: string; name: string }[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  });
  const options: { code: string; name: string }[] = [];

  for (let offset = 0; offset < MONTHS_BACK; offset += 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    const code = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0')}`;
    options.push({ code, name: formatter.format(date) });
  }

  return options;
}
