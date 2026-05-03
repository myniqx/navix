import { FocusNode } from './FocusNode';
import { InputManager } from './InputManager';
import type { InputConfig, NavEvent } from './types';

export class FocusTree {
  root: FocusNode;
  inputManager: InputManager;

  constructor(config?: InputConfig) {
    this.root = new FocusNode('root');
    this.inputManager = new InputManager(config);

    this.inputManager.onNavEvent = (event: NavEvent) => {
      return this.handleNavEvent(event);
    };
  }

  handleNavEvent(event: NavEvent): boolean {
    return this.root.handleEvent(event);
  }

  destroy(): void {
    this.inputManager.destroy();
    this.root.destroy();
  }
}
