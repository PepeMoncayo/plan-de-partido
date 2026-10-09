const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

// Solo convierte las claves de primer nivel: el contenido jsonb ya va en camelCase.
export const rowToCamel = (row) =>
  row ? Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v])) : row;

export const objToSnake = (obj) =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [toSnake(k), v])
  );
