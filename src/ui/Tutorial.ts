import { TUTORIAL } from '../config/gameConfig';
import type { GameSnapshot } from '../game/types';

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing tutorial element: ${selector}`);
  return element;
}

export class Tutorial {
  readonly element: HTMLElement;
  onSkip: () => void = () => undefined;

  private readonly image: HTMLImageElement;
  private readonly step: HTMLElement;
  private readonly title: HTMLElement;
  private readonly description: HTMLElement;
  private readonly counter: HTMLElement;
  private readonly progress: HTMLElement;
  private readonly progressFill: HTMLElement;
  private readonly time: HTMLElement;
  private currentCard = -1;
  private visible = false;

  constructor() {
    this.element = document.createElement('section');
    this.element.className = 'tutorial-screen is-hidden';
    this.element.setAttribute('aria-label', 'How to play CLOUD POST!');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.innerHTML = `
      <div class="tutorial-shell">
        <header class="tutorial-header">
          <span>CLOUD POST! <i>/</i> FLIGHT SCHOOL</span>
          <span class="tutorial-counter">01 / ${String(TUTORIAL.cards.length).padStart(2, '0')}</span>
        </header>
        <div class="tutorial-card">
          <figure class="tutorial-illustration">
            <img class="tutorial-image" alt="" draggable="false" />
          </figure>
          <div class="tutorial-copy">
            <span class="tutorial-step">STEP 01</span>
            <h2 class="tutorial-title"></h2>
            <p class="tutorial-description"></p>
          </div>
        </div>
        <footer class="tutorial-footer">
          <div class="tutorial-timing">
            <div class="tutorial-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin="0">
              <span class="tutorial-progress-fill"></span>
            </div>
            <span class="tutorial-time">5s</span>
          </div>
          <button class="tutorial-skip" type="button" aria-label="Skip tutorial">
            <span>SKIP</span><kbd>ENTER</kbd>
          </button>
        </footer>
      </div>`;

    this.image = required(this.element, '.tutorial-image');
    this.step = required(this.element, '.tutorial-step');
    this.title = required(this.element, '.tutorial-title');
    this.description = required(this.element, '.tutorial-description');
    this.counter = required(this.element, '.tutorial-counter');
    this.progress = required(this.element, '.tutorial-progress');
    this.progressFill = required(this.element, '.tutorial-progress-fill');
    this.time = required(this.element, '.tutorial-time');

    TUTORIAL.cards.forEach((card) => {
      const preload = new Image();
      preload.src = card.image;
    });

    this.element.addEventListener('click', () => this.skip());
    window.addEventListener('keydown', this.handleKeyDown);
  }

  show(): void {
    this.visible = true;
    this.element.classList.remove('is-hidden');
    this.element.setAttribute('aria-hidden', 'false');
    this.currentCard = -1;
    this.renderCard(0);
    this.updateProgress(0, TUTORIAL.duration);
  }

  hide(): void {
    this.visible = false;
    this.element.classList.add('is-hidden');
    this.element.setAttribute('aria-hidden', 'true');
  }

  update(snapshot: GameSnapshot): void {
    if (!this.visible || !snapshot.tutorial) return;
    const { elapsed, duration } = snapshot.tutorial;
    const safeDuration = Math.max(0.001, duration);
    const progress = Math.min(1, Math.max(0, elapsed / safeDuration));
    const index = Math.min(TUTORIAL.cards.length - 1, Math.floor(progress * TUTORIAL.cards.length));
    this.renderCard(index);
    this.updateProgress(elapsed, safeDuration);
  }

  private renderCard(index: number): void {
    if (index === this.currentCard || index < 0) return;
    const card = TUTORIAL.cards[index];
    if (!card) return;
    this.currentCard = index;
    this.image.src = card.image;
    this.image.alt = `${card.title} illustration`;
    this.step.textContent = `STEP ${String(index + 1).padStart(2, '0')}`;
    this.title.textContent = card.title;
    this.description.textContent = card.description;
    this.counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(TUTORIAL.cards.length).padStart(2, '0')}`;

    const container = required<HTMLElement>(this.element, '.tutorial-card');
    container.classList.remove('is-swapping');
    void container.offsetWidth;
    container.classList.add('is-swapping');
  }

  private updateProgress(elapsed: number, duration: number): void {
    const clamped = Math.min(duration, Math.max(0, elapsed));
    const remaining = Math.max(0, duration - clamped);
    this.progress.setAttribute('aria-valuemax', String(Math.round(duration)));
    this.progress.setAttribute('aria-valuenow', String(Math.round(clamped)));
    this.progressFill.style.transform = `scaleX(${duration > 0 ? clamped / duration : 1})`;
    this.time.textContent = `${Math.ceil(remaining)}s`;
  }

  private skip(): void {
    if (!this.visible) return;
    this.hide();
    this.onSkip();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible || event.key !== 'Enter' || event.repeat) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.skip();
  };
}
