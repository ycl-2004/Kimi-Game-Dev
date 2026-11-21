import { TUTORIAL } from '../config/gameConfig';
import type { GameSnapshot } from '../game/types';
import { icon } from './icons';

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing tutorial element: ${selector}`);
  return element;
}

export class Tutorial {
  readonly element: HTMLElement;
  onNext: () => void = () => undefined;
  onPrev: () => void = () => undefined;
  onSelectStep: (index: number) => void = () => undefined;
  onSkip: () => void = () => undefined;

  private readonly image: HTMLImageElement;
  private readonly step: HTMLElement;
  private readonly title: HTMLElement;
  private readonly description: HTMLElement;
  private readonly details: HTMLUListElement;
  private readonly counter: HTMLElement;
  private readonly progress: HTMLElement;
  private readonly progressFill: HTMLElement;
  private readonly dots: HTMLElement;
  private readonly backButton: HTMLButtonElement;
  private readonly skipButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly nextLabel: HTMLElement;
  private currentCard = -1;
  private visible = false;

  constructor() {
    this.element = document.createElement('section');
    this.element.className = 'tutorial-screen is-hidden';
    this.element.setAttribute('aria-label', 'How to play POP ISLAND');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.innerHTML = `
      <div class="tutorial-shell">
        <header class="tutorial-header">
          <span>POP ISLAND <i>/</i> FLIGHT SCHOOL</span>
          <div class="tutorial-dots" role="tablist" aria-label="Tutorial steps">
            ${TUTORIAL.cards.map((_, i) => `<button type="button" class="tutorial-dot" data-step="${i}" aria-label="Step ${i + 1}"></button>`).join('')}
          </div>
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
            <ul class="tutorial-details"></ul>
          </div>
        </div>
        <div class="tutorial-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin="1" aria-valuemax="${TUTORIAL.cards.length}" aria-valuenow="1">
          <span class="tutorial-progress-fill"></span>
        </div>
        <footer class="tutorial-footer">
          <div class="tutorial-secondary">
            <button class="tutorial-back" type="button" aria-label="Previous step" hidden>BACK</button>
            <button class="tutorial-skip" type="button" aria-label="Skip tutorial">SKIP</button>
          </div>
          <button class="tutorial-next primary-button" type="button">
            <span class="tutorial-next-label">NEXT</span><span class="tutorial-start-short" aria-hidden="true">START</span>${icon('arrow')}<kbd class="key-hint">ENTER</kbd>
          </button>
        </footer>
      </div>`;

    this.image = required(this.element, '.tutorial-image');
    this.step = required(this.element, '.tutorial-step');
    this.title = required(this.element, '.tutorial-title');
    this.description = required(this.element, '.tutorial-description');
    this.details = required(this.element, '.tutorial-details');
    this.counter = required(this.element, '.tutorial-counter');
    this.progress = required(this.element, '.tutorial-progress');
    this.progressFill = required(this.element, '.tutorial-progress-fill');
    this.dots = required(this.element, '.tutorial-dots');
    this.backButton = required(this.element, '.tutorial-back');
    this.skipButton = required(this.element, '.tutorial-skip');
    this.nextButton = required(this.element, '.tutorial-next');
    this.nextLabel = required(this.element, '.tutorial-next-label');

    TUTORIAL.cards.forEach((card) => {
      const preload = new Image();
      preload.src = card.image;
    });

    this.dots.querySelectorAll<HTMLButtonElement>('.tutorial-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const index = Number(dot.dataset.step);
        if (this.visible && Number.isFinite(index)) this.onSelectStep(index);
      });
    });
    this.nextButton.addEventListener('click', () => {
      if (this.visible) this.onNext();
    });
    this.backButton.addEventListener('click', () => {
      if (this.visible) this.onPrev();
    });
    this.skipButton.addEventListener('click', () => this.skip());
    window.addEventListener('keydown', this.handleKeyDown);
  }

  show(): void {
    this.visible = true;
    this.element.classList.remove('is-hidden');
    this.element.setAttribute('aria-hidden', 'false');
    this.currentCard = -1;
    this.renderCard(0);
  }

  hide(): void {
    this.visible = false;
    this.element.classList.add('is-hidden');
    this.element.setAttribute('aria-hidden', 'true');
  }

  update(snapshot: GameSnapshot): void {
    if (!this.visible || !snapshot.tutorial) return;
    this.renderCard(snapshot.tutorial.cardIndex);
  }

  private renderCard(index: number): void {
    if (index === this.currentCard || index < 0 || index >= TUTORIAL.cards.length) return;
    const card = TUTORIAL.cards[index];
    if (!card) return;
    this.currentCard = index;
    const isLast = index === TUTORIAL.cards.length - 1;

    this.image.src = card.image;
    this.image.alt = `${card.title} illustration`;
    this.step.textContent = `STEP ${String(index + 1).padStart(2, '0')}`;
    this.title.textContent = card.title;
    this.description.textContent = card.description;
    this.details.replaceChildren(...(card.details ?? []).map((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
    this.counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(TUTORIAL.cards.length).padStart(2, '0')}`;

    this.backButton.hidden = index === 0;
    this.nextLabel.textContent = isLast ? 'READY TO START!' : 'NEXT';
    this.nextButton.classList.toggle('is-ready', isLast);
    this.nextButton.setAttribute('aria-label', isLast ? 'Ready to start level 1' : 'Next tutorial step');

    this.progress.setAttribute('aria-valuenow', String(index + 1));
    this.progressFill.style.transform = `scaleX(${(index + 1) / TUTORIAL.cards.length})`;

    this.dots.querySelectorAll<HTMLElement>('.tutorial-dot').forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === index);
      dot.classList.toggle('is-done', dotIndex < index);
    });

    const container = required<HTMLElement>(this.element, '.tutorial-card');
    container.classList.remove('is-swapping');
    void container.offsetWidth;
    container.classList.add('is-swapping');
  }

  private skip(): void {
    if (!this.visible) return;
    this.hide();
    this.onSkip();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible || event.repeat) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.onNext();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.onPrev();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.skip();
    }
  };
}
