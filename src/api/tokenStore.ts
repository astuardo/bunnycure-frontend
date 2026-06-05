const ACCESS_TOKEN_KEY = 'bunnycure-access-token';

let memoryToken: string | null =
  typeof window !== 'undefined' ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;

const notifyTokenChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('bunnycure-access-token-changed'));
  }
};

export const setInMemoryToken = (token: string | null) => {
  memoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
  notifyTokenChange();
};

export const getInMemoryToken = (): string | null => {
  if (memoryToken) return memoryToken;

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored) {
      memoryToken = stored;
      return stored;
    }
  }

  return null;
};

export const clearInMemoryToken = () => {
  memoryToken = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  notifyTokenChange();
};
