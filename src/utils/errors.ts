export let errors: Record<string, string> = {};

export const getErrors = () => errors;

export const setError = (id: string, value: string) => {
  errors[id] = value;
};

export const clearError = (id: string) => {
  if (errors[id]) {
    delete errors[id];
  }
};

export const clearAllErrors = () => {
  errors = {};
};
