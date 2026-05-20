let memoryToken: string | null = null;

const notifyTokenChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('bunnycure-access-token-changed'));
  }
};

export const setInMemoryToken = (token: string | null) => {
  memoryToken = token;
  notifyTokenChange();
};

export const getInMemoryToken = (): string | null => memoryToken;

export const clearInMemoryToken = () => {
  memoryToken = null;
  notifyTokenChange();
};
