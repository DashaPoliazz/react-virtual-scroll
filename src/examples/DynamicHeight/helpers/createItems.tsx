import { faker } from "@faker-js/faker";

export const createItems = (amountOfItems: number) => {
  return new Array(amountOfItems).fill(0).map((_, idx) => ({
    id: idx,
    content: faker.lorem.paragraphs({
      min: 3,
      max: 6,
    }),
  }));
};
