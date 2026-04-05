export const kebabToCamel = (kebabCase: string): string =>
  kebabCase.replace(/-([a-z])/g, (_, match) => match.toUpperCase());
