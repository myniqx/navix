let _merge: ((...classes: (string | undefined)[]) => string) | undefined;

export function setMergeClassName(fn: typeof _merge) {
  _merge = fn;
}

export function mergeClassName(...classes: (string | undefined)[]): string {
  if (_merge) return _merge(...classes);
  return classes.filter(Boolean).join(' ');
}
