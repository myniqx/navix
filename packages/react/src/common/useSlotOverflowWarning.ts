import { useEffect, useRef } from 'react';

// Tracks which (component, fKey) pairs we've already warned about so the
// console stays quiet on re-renders.
const _warned = new Set<string>();

/**
 * Dev-only check: warn if the rendered child overflows its slot box.
 *
 * The Slot div sets a fixed cross-axis size (height for horizontal lists,
 * width for vertical). If the child has a larger intrinsic size — e.g. a
 * card with fixed-height children that can't shrink — it'll overflow into
 * the neighbouring slot, which is silent and confusing. We warn so the
 * developer can fix the child's flex/min-content behaviour.
 *
 * Production builds are no-op.
 */
export function useSlotOverflowWarning(
  ref: React.RefObject<HTMLElement | null>,
  componentName: string,
  fKey: string,
): void {
  // The hook signature is stable across builds; the work happens only in dev.
  const warnedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = ((globalThis as any).process?.env?.NODE_ENV) as string | undefined;
    if (env === 'production') return;
    const el = ref.current;
    if (!el) return;

    const check = () => {
      if (warnedRef.current) return;
      // Allow 1px of tolerance for sub-pixel rounding.
      const overflowsCross = el.scrollHeight > el.clientHeight + 1;
      const overflowsMain = el.scrollWidth > el.clientWidth + 1;
      if (!overflowsCross && !overflowsMain) return;

      const tag = `${componentName}:${fKey}`;
      if (_warned.has(tag)) return;
      _warned.add(tag);
      warnedRef.current = true;

      // eslint-disable-next-line no-console
      console.warn(
        `[${componentName}] Slot content overflows its assigned box for item "${fKey}". ` +
          `Slot is ${el.clientWidth.toFixed(1)}×${el.clientHeight.toFixed(1)}, ` +
          `content needs ${el.scrollWidth.toFixed(1)}×${el.scrollHeight.toFixed(1)}. ` +
          `The rendered child has a larger min-content than the slot can give. ` +
          `Make the child shrinkable (e.g. height: '100%', minHeight: 0, flex children) ` +
          `or increase the grid/list size.`,
      );
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, componentName, fKey]);
}
