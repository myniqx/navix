export interface NavEvent {
  action: string;
  type: 'press' | 'longpress' | 'doublepress';
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
