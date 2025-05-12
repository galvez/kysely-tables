export const REFERENCE_UTILITY =
  /^Reference<([^,]+),\s*(['"]?)([^,'"]+)\2,\s*([^>]+)>$/

export const SIZED_UTILITY = /^Sized<([^,]+),\s*(\d+)>$/

export const NULLABLE = /\|\s*null\s*|\s*null\s*\|/

export const UNION_WITH_NULL = /^(.+?)\s*\|\s*null\s*$|^null\s*\|\s*(.+?)$/

export const UNION_WITH_UNDEFINED =
  /^(.+?)\s*\|\s*undefined\s*$|^undefined\s*\|\s*(.+?)$/
