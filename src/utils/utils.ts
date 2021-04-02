export function removeUndefinedKeys<T>(obj: T): T {
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
}
