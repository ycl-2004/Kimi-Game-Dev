import { ISLANDS, LEVELS } from '../config/gameConfig';
import type { StageTransitionSnapshot } from '../game/types';
import { icon } from './icons';

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing flow transition element: ${selector}`);
  return element;
}

function formatSpeed(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}×`;
}

const BERRY_ISLAND = ISLANDS.find((island) => island.id === 3) ?? ISLANDS[0];
const STARS_ISLAND = ISLANDS.find((island) => island.id === 4) ?? ISLANDS[0];

export class FlowTransition {
  readonly element: HTMLElement;
  onReady: () => void = () => undefined;

  private readonly panel: HTMLElement;
  private readonly stageBadge: HTMLElement;
  private readonly nextLevel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly description: HTMLElement;
  private readonly beltFrom: HTMLElement;
  private readonly beltTo: HTMLElement;
  private readonly multiplier: HTMLElement;
  private readonly readyButton: HTMLButtonElement;
  private visible = false;

  constructor() {
    this.element = document.createElement('section');
    this.element.className = 'flow-transition is-hidden';
    this.element.dataset.kind = 'speed';
    this.element.setAttribute('aria-label', 'Next delivery route');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('aria-live', 'polite');
    this.element.innerHTML = `
      <div class="flow-transition-panel">
        <header class="flow-transition-header">
          <span class="flow-stage-badge">NEXT DELIVERY ROUTE</span>
          <strong class="flow-next-level">NORMAL</strong>
        </header>
        <div class="flow-transition-visual">
          <div class="flow-speed-view">
            <div class="flow-belt" aria-hidden="true">
              <span class="flow-belt-parcel">${icon('parcel')}</span>
              <span class="flow-belt-parcel">${icon('parcel')}</span>
              <span class="flow-belt-parcel">${icon('parcel')}</span>
            </div>
            <div class="flow-speed-readout">
              <span><small>BELT</small><strong class="flow-belt-from">0.5×</strong></span>
              <i aria-hidden="true">→</i>
              <span><small>FASTER</small><strong class="flow-belt-to">1×</strong></span>
            </div>
            <div class="flow-multiplier">SCORE MULTIPLIER <strong class="flow-multiplier-value">×1.5</strong></div>
            <div class="flow-new-parcels">
              <span class="flow-parcel-chip is-fragile">${icon('fragile')}<span>FRAGILE · NARROW GOLD</span></span>
              <span class="flow-parcel-chip is-express">${icon('express')}<span>EXPRESS · TIMED</span></span>
            </div>
          </div>
          <div class="flow-chord-view">
            <div class="flow-chord-destination flow-chord-berry" style="background:${BERRY_ISLAND.color}">
              <span class="flow-chord-island">${icon('berry')}</span>
              <div class="flow-chord-copy"><strong>BERRY FARM</strong><span>HOLD TOGETHER · RELEASE TOGETHER</span></div>
              <div class="flow-chord-keys" aria-label="Hold keys 1 and 2 together"><kbd>1</kbd><i>+</i><kbd>2</kbd></div>
            </div>
            <div class="flow-chord-destination flow-chord-observatory" style="background:${STARS_ISLAND.color}">
              <span class="flow-chord-island">${icon('observatory')}</span>
              <div class="flow-chord-copy"><strong>STAR OBSERVATORY</strong><span>HOLD TOGETHER · RELEASE TOGETHER</span></div>
              <div class="flow-chord-keys" aria-label="Hold keys 2 and 3 together"><kbd>2</kbd><i>+</i><kbd>3</kbd></div>
            </div>
            <p class="flow-five-islands">FIVE ISLANDS · TWO-KEY DELIVERIES</p>
          </div>
        </div>
        <div class="flow-transition-copy">
          <h2 class="flow-transition-title"></h2>
          <p class="flow-transition-description"></p>
        </div>
        <footer class="flow-transition-footer">
          <button class="flow-ready-button primary-button" type="button">
            <span>READY TO START!</span>${icon('arrow')}<kbd class="key-hint">ENTER</kbd>
          </button>
        </footer>
      </div>`;

    this.panel = required(this.element, '.flow-transition-panel');
    this.stageBadge = required(this.element, '.flow-stage-badge');
    this.nextLevel = required(this.element, '.flow-next-level');
    this.title = required(this.element, '.flow-transition-title');
    this.description = required(this.element, '.flow-transition-description');
    this.beltFrom = required(this.element, '.flow-belt-from');
    this.beltTo = required(this.element, '.flow-belt-to');
    this.multiplier = required(this.element, '.flow-multiplier-value');
    this.readyButton = required(this.element, '.flow-ready-button');

    this.readyButton.addEventListener('click', () => this.confirm());
    window.addEventListener('keydown', this.handleKeyDown);
  }

  show(transition: StageTransitionSnapshot): void {
    const nextIndex = LEVELS.findIndex((level) => level.id === transition.nextLevelId);
    const next = LEVELS[nextIndex];
    const previous = LEVELS[Math.max(0, nextIndex - 1)];

    this.visible = true;
    this.element.dataset.kind = transition.kind;
    this.stageBadge.textContent = nextIndex >= 0
      ? `LEVEL ${nextIndex + 1} OF ${LEVELS.length} · NEXT ROUTE`
      : 'NEXT DELIVERY ROUTE';
    this.nextLevel.textContent = next?.name.toUpperCase() ?? transition.nextLevelId.toUpperCase();
    this.title.textContent = transition.title;
    this.description.textContent = transition.description;
    this.beltFrom.textContent = formatSpeed(previous?.beltSpeed ?? 0.5);
    this.beltTo.textContent = formatSpeed(next?.beltSpeed ?? 1);
    this.multiplier.textContent = `×${next?.multiplier ?? 1.5}`;

    this.element.classList.remove('is-hidden');
    this.element.setAttribute('aria-hidden', 'false');
    this.panel.classList.remove('is-entering');
    void this.panel.offsetWidth;
    this.panel.classList.add('is-entering');
  }

  hide(): void {
    this.visible = false;
    this.element.classList.add('is-hidden');
    this.element.setAttribute('aria-hidden', 'true');
  }

  private confirm(): void {
    if (!this.visible) return;
    this.hide();
    this.onReady();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible || event.repeat) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.confirm();
    }
  };
}
