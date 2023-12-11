
export function cast<T>(object: any): T {
  return ((object as undefined) as T)
}