import { Map } from "immutable";

export function getOrElse<K, V>(
  key: K,
  map: Map<K, V>,
  ifEmptyProvider: () => Promise<V>
): Promise<V> {
  const value = map.get(key);
  if (value) {
    return Promise.resolve(value);
  }
  return ifEmptyProvider();
}

export function objectToMap(obj: Record<string, any>): Map<string, any> {
  return Object.entries(obj).reduce(
    (map, [key, value]) => map.set(key, value),
    Map<string, any>()
  );
}
