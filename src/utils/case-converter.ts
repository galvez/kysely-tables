export function convertToSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

export function getTableNameFromInterface(interfaceName: string): string {
  const withoutSuffix = interfaceName.replace(/Table$/, '');
  return convertToSnakeCase(withoutSuffix);
}