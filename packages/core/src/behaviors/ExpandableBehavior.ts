import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

/**
 * ExpandableBehavior
 *
 * Turns a FocusNode into a two-state container:
 *
 * COLLAPSED (default):
 *   - enter → collapses all other expandables in the tree, then expands self
 *   - all other events → return false (parent handles navigation)
 *
 * EXPANDED:
 *   - back → collapses, emits onChange(false), returns true (consumed)
 *   - all other events → return true (swallowed) — focus is trapped here.
 *     Children receive events first via handleEvent's top-down routing.
 *     If no child consumes it, this node swallows it so nothing escapes to parent.
 *
 * Exclusive expand — only one expandable can be open at a time:
 *   On expand, walks the entire tree from root via node.getRoot(),
 *   calls behavior.collapse() on every other node that has one.
 *   No coordination needed from the adapter layer — core handles it entirely.
 */
export class ExpandableBehavior implements IFocusNodeBehavior {
  isExpanded: boolean = false;

  // Called whenever expanded state changes. Assign from the adapter layer.
  onChange: ((expanded: boolean) => void) | null = null;

  // Stored node reference so public expand() can trigger the tree walk
  private _node: FocusNode;

  constructor(node: FocusNode) {
    this._node = node;
    node.behavior = this;

    node.onEvent = (e: NavEvent): boolean => {
      if (!this.isExpanded) {
        if (e.action === 'enter' && e.type === 'press') {
          this.expand();
          return true;
        }
        return false;
      }

      if (e.action === 'back' && e.type === 'press') {
        this.collapse();
        return true;
      }

      // Expanded: swallow all other events — focus is trapped inside this node.
      return true;
    };
  }

  onUnregister(): void {
    this.isExpanded = false
  }

  expand(): void {
    if (this.isExpanded) return;
    // Walk entire tree from root, collapse every other expandable
    this._walkCollapse(this._node.getRoot());
    this.isExpanded = true;
    this.onChange?.(true);
  }

  collapse(): void {
    if (!this.isExpanded) return;
    this.isExpanded = false;
    this.onChange?.(false);
  }

  // Recursively walk the tree and collapse all expandables except self
  private _walkCollapse(current: FocusNode): void {
    if (current !== this._node) {
      current.behavior?.collapse?.();
    }
    for (const child of current.children) {
      this._walkCollapse(child);
    }
  }
}
