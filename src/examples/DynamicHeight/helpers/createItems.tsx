export const createItems = (amountOfItems: number) => {
  return new Array(amountOfItems).fill(0).map((_, idx) => ({
    id: idx,
    content: idx,
  }));
};
