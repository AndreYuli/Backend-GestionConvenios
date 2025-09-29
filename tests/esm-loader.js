// ESM Loader para Jest
export async function resolve(specifier, context, defaultResolve) {
  if (specifier.endsWith('.js') && !specifier.includes('node_modules')) {
    return defaultResolve(specifier, { ...context, format: 'module' });
  }
  return defaultResolve(specifier, context);
}