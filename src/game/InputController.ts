import { ISLANDS } from '../config/gameConfig';

interface InputCallbacks {
  onPress: (id: number) => void;
  onRelease: (id: number) => void;
  onFever: () => void;
  onConfirm: () => void;
}

interface HoldBinding {
  element: HTMLElement;
  key: string;
  touchAction: string;
  userSelect: string;
  webkitTouchCallout: string;
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onContextMenu: (event: MouseEvent) => void;
  onDragStart: (event: DragEvent) => void;
}

export class InputController {
  private readonly heldKeys = new Set<string>();
  private readonly heldPointers = new Map<number, string>();
  private readonly bindings: HoldBinding[] = [];
  private resolvedIslandId: number | null = null;
  private destroyed = false;

  constructor(private readonly callbacks: InputCallbacks) {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp, { passive: false });
    window.addEventListener('blur', this.releaseAll);
    window.addEventListener('pointerup', this.onGlobalPointerUp, { passive: false });
    window.addEventListener('pointercancel', this.onGlobalPointerUp, { passive: false });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  bindHoldButton(element: HTMLElement, key: string): void {
    if (this.destroyed || this.bindings.some((binding) => binding.element === element)) return;

    const normalizedKey = this.normalizeKey(key);
    const binding: HoldBinding = {
      element,
      key: normalizedKey,
      touchAction: element.style.getPropertyValue('touch-action'),
      userSelect: element.style.getPropertyValue('user-select'),
      webkitTouchCallout: element.style.getPropertyValue('-webkit-touch-callout'),
      onPointerDown: (event) => {
        if (event.button !== 0 || this.destroyed) return;
        event.preventDefault();
        this.heldPointers.set(event.pointerId, normalizedKey);
        try {
          element.setPointerCapture(event.pointerId);
        } catch {
          // Global pointer listeners still release the input if capture is unavailable.
        }
        this.resolveHeldInputs();
      },
      onPointerUp: (event) => {
        if (!this.heldPointers.has(event.pointerId)) return;
        event.preventDefault();
        this.releasePointer(event.pointerId);
      },
      onContextMenu: (event) => event.preventDefault(),
      onDragStart: (event) => event.preventDefault(),
    };

    element.style.setProperty('touch-action', 'none');
    element.style.setProperty('user-select', 'none');
    element.style.setProperty('-webkit-touch-callout', 'none');
    element.addEventListener('pointerdown', binding.onPointerDown, { passive: false });
    element.addEventListener('pointerup', binding.onPointerUp, { passive: false });
    element.addEventListener('pointercancel', binding.onPointerUp, { passive: false });
    element.addEventListener('lostpointercapture', binding.onPointerUp);
    element.addEventListener('contextmenu', binding.onContextMenu);
    element.addEventListener('dragstart', binding.onDragStart);
    this.bindings.push(binding);
  }

  destroy(): void {
    if (this.destroyed) return;

    this.releaseAll();
    this.destroyed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.releaseAll);
    window.removeEventListener('pointerup', this.onGlobalPointerUp);
    window.removeEventListener('pointercancel', this.onGlobalPointerUp);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    for (const binding of this.bindings) {
      const { element } = binding;
      element.removeEventListener('pointerdown', binding.onPointerDown);
      element.removeEventListener('pointerup', binding.onPointerUp);
      element.removeEventListener('pointercancel', binding.onPointerUp);
      element.removeEventListener('lostpointercapture', binding.onPointerUp);
      element.removeEventListener('contextmenu', binding.onContextMenu);
      element.removeEventListener('dragstart', binding.onDragStart);
      this.restoreStyle(element, 'touch-action', binding.touchAction);
      this.restoreStyle(element, 'user-select', binding.userSelect);
      this.restoreStyle(element, '-webkit-touch-callout', binding.webkitTouchCallout);
    }
    this.bindings.length = 0;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.destroyed || this.isEditableTarget(event.target)) return;

    if (this.isSpace(event)) {
      event.preventDefault();
      if (!event.repeat) this.callbacks.onFever();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) this.callbacks.onConfirm();
      return;
    }

    const key = this.normalizeKey(event.key);
    if (!this.isIslandInput(key)) return;
    event.preventDefault();
    if (event.repeat || this.heldKeys.has(key)) return;
    this.heldKeys.add(key);
    this.resolveHeldInputs();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.isSpace(event) || event.key === 'Enter') {
      if (!this.isEditableTarget(event.target)) event.preventDefault();
      return;
    }

    const key = this.normalizeKey(event.key);
    if (!this.heldKeys.has(key)) return;
    event.preventDefault();
    this.heldKeys.delete(key);
    this.resolveHeldInputs();
  };

  private readonly onGlobalPointerUp = (event: PointerEvent): void => {
    if (this.heldPointers.has(event.pointerId)) {
      event.preventDefault();
      this.releasePointer(event.pointerId);
    }
  };

  private readonly releaseAll = (): void => {
    if (this.heldKeys.size === 0 && this.heldPointers.size === 0) return;
    this.heldKeys.clear();
    this.heldPointers.clear();
    this.resolveHeldInputs();
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.releaseAll();
  };

  private releasePointer(pointerId: number): void {
    this.heldPointers.delete(pointerId);
    this.resolveHeldInputs();
  }

  private resolveHeldInputs(): void {
    const heldInputs = new Set<string>([...this.heldKeys, ...this.heldPointers.values()]);
    const match = ISLANDS.find((island) => {
      const inputs = island.inputs.map((input) => this.normalizeKey(input));
      return inputs.length === heldInputs.size && inputs.every((input) => heldInputs.has(input));
    });
    const nextIslandId = match?.id ?? null;
    if (nextIslandId === this.resolvedIslandId) return;

    const previousIslandId = this.resolvedIslandId;
    this.resolvedIslandId = nextIslandId;
    if (previousIslandId !== null) this.callbacks.onRelease(previousIslandId);
    if (nextIslandId !== null) this.callbacks.onPress(nextIslandId);
  }

  private isIslandInput(key: string): boolean {
    return ISLANDS.some((island) => island.inputs.some((input) => this.normalizeKey(input) === key));
  }

  private normalizeKey(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key;
  }

  private isSpace(event: KeyboardEvent): boolean {
    return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
  }

  private restoreStyle(element: HTMLElement, property: string, value: string): void {
    if (value) element.style.setProperty(property, value);
    else element.style.removeProperty(property);
  }
}
