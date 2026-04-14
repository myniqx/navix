export interface NavEvent {
  action: string;
  type: 'press' | 'longpress' | 'doublepress';
}

/**
 * Interface that all behavior classes implement.
 * Behaviors attach themselves to a FocusNode via node.behavior = this.
 * All methods are optional — implement only what the behavior needs.
 */
export interface IFocusNodeBehavior {
  // Called after the node is registered into a parent
  onRegister?: () => void;
  // Called before the node is removed from its parent
  onUnregister?: () => void;
  // Collapse this node — only meaningful for ExpandableBehavior
  collapse?: () => void;
  // Expand this node — only meaningful for ExpandableBehavior
  expand?: () => void;
}

export interface ActionConfig {
  keys: string[];
  longpress?: boolean;
  longpressMs?: number;
  doublepress?: boolean;
  doublepressMs?: number;
}

export interface InputConfig {
  actions: Record<string, ActionConfig>;
}
