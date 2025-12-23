import slugify from 'slugify';

export const titleToSlug = (title: string): string => {
  return `${slugify(title, { lower: true })}-${Math.floor(10 + Math.random() * 90)}`;
};
