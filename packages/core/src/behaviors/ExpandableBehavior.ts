import type { FocusNode } from '../FocusNode';
import type { NavEvent } from '../types';

/**
 * ExpandableBehavior
 *
 * Turns a FocusNode into a two-state container:
 *
 * COLLAPSED (default):
 *   - enter → expands, emits onChange(true), returns true (consumed)
 *   - all other events → return false (parent handles navigation)
 *
 * EXPANDED:
 *   - back → collapses, emits onChange(false), returns true (consumed)
 *   - all other events → return true (swallowed) — focus is trapped here.
 *     Children receive events first via handleEvent's top-down routing.
 *     If no child consumes it, this node swallows it so nothing escapes to parent.
 *
 * The adapter layer (React, Vue, etc.) is responsible for:
 *   - subscribing to onChange to know when to mount/unmount children
 *   - rendering children only when expanded (conditional render)
 *
 * No framework code here — onChange is a plain callback.
 */
export class ExpandableBehavior {
  isExpanded: boolean = false;

  // Called whenever expanded state changes. Assign from the adapter layer.
  onChange: ((expanded: boolean) => void) | null = null;

  constructor(node: FocusNode) {
    node.onEvent = (e: NavEvent): boolean => {
      if (!this.isExpanded) {
        if (e.action === 'enter' && e.type === 'press') {
          this.isExpanded = true;
          this.onChange?.(true);
          return true;
        }
        // Collapsed: pass everything else up so parent can navigate
        return false;
      }

      // Expanded: back collapses
      if (e.action === 'back' && e.type === 'press') {
        this.isExpanded = false;
        this.onChange?.(false);
        return true;
      }

      // Expanded: swallow all other events — focus is trapped inside this node.
      // onEvent is called only after active children already returned false,
      // so children had their chance. Returning true here prevents the event
      // from escaping to the parent (e.g. up/down must not move to a sibling row).
      return true;
    };
  }

  expand(): void {
    if (this.isExpanded) return;
    this.isExpanded = true;
    this.onChange?.(true);
  }

  collapse(): void {
    if (!this.isExpanded) return;
    this.isExpanded = false;
    this.onChange?.(false);
  }
}
