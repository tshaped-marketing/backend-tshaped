import prismaClient from '../prisma/prisma.client.js';

const defaultHeroes = [
  {
    slug: 'homepage-main-hero',
    title: 'Learn anything, grow everywhere',
    paragraph: 'Access curated courses and track your progress with powerful tools tailored for modern learners.',
    imageUrl: 'https://example.com/images/hero-default.jpg',
  },
];

export const seedHeroComponents = async () => {
  for (const hero of defaultHeroes) {
    await prismaClient.heroComponent.upsert({
      where: { slug: hero.slug },
      update: {
        title: hero.title,
        paragraph: hero.paragraph,
        imageUrl: hero.imageUrl,
        isActive: true,
      },
      create: {
        slug: hero.slug,
        title: hero.title,
        paragraph: hero.paragraph,
        imageUrl: hero.imageUrl,
      },
    });
  }
};





