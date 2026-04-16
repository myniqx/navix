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

  // Signals to requestFocus() that this node is a focus trap while expanded.
  // Other behaviors leave this undefined — only ExpandableBehavior opts in.
  get isTrapped(): boolean {
    return this.isExpanded;
  }

  // Called whenever expanded state changes. Assign from the adapter layer.
  onChange: ((expanded: boolean) => void) | null = null;
  onChildRegistered?: ((child: FocusNode) => void) | undefined;
  onChildUnregistered?: ((child: FocusNode) => void) | undefined;
  onBlurred?: ((child: FocusNode) => void) | undefined;
  onFocus?: ((child: FocusNode) => void) | undefined;

  // Stored node reference so public expand() can trigger the tree walk
  private _node: FocusNode;

  constructor(node: FocusNode) {
    this._node = node;
    node.behavior = this;
  }

  onEvent = (e: NavEvent): boolean => {
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

  onUnregister(): void {
    this.isExpanded = false
  }

  expand(): void {
    if (this.isExpanded) return;
    // Ancestors must not be collapsed — we are expanding inside them.
    const ancestors = this._getAncestors();
    this._walkCollapse(this._node.getRoot(), ancestors);
    // Request focus before setting isExpanded — trap is not yet active so
    // _findTrap won't block this node's own requestFocus call
    this._node.requestFocus();
    this.isExpanded = true;
    this.onChange?.(true);
  }

  collapse(): void {
    if (!this.isExpanded) return;
    this.isExpanded = false;
    this.onChange?.(false);
  }

  private _getAncestors(): Set<FocusNode> {
    const set = new Set<FocusNode>();
    let current = this._node.parent;
    while (current !== null) {
      set.add(current);
      current = current.parent;
    }
    return set;
  }

  // Recursively walk the tree and collapse all expandables except self and ancestors
  private _walkCollapse(current: FocusNode, ancestors: Set<FocusNode>): void {
    if (current !== this._node && !ancestors.has(current)) {
      current.behavior?.collapse?.();
    }
    for (const child of current.children) {
      this._walkCollapse(child, ancestors);
    }
  }
}
