import countryList from 'country-list';

export interface CountryOption {
  code: string;
  name: string;
}

export const COUNTRIES: CountryOption[] = countryList
  .getData()
  .map(({ code, name }) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getCountryName(code: string): string | undefined {
  return COUNTRIES.find(country => country.code === code)?.name;
}
