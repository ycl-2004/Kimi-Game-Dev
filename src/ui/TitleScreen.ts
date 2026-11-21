import { ONBOARDING_LINE } from '../config/gameConfig';
import { icon, logoMark } from './icons';

export class TitleScreen {
  readonly element: HTMLElement;
  onStart: () => void = () => undefined;
  onLeaderboard: () => void = () => undefined;
  onSound: (enabled: boolean) => void = () => undefined;
  onToggleSound: () => void = () => undefined;

  private visible = true;
  private soundEnabled = true;
  private readonly soundButton: HTMLButtonElement;

  constructor() {
    this.element = document.createElement('section');
    this.element.className = 'title-screen';
    this.element.setAttribute('aria-label', 'CLOUD POST! title screen');
    this.element.innerHTML = `
      <div class="title-content">
        <div class="title-eyebrow"><span></span> SPECIAL DELIVERY DIVISION <span></span></div>
        <div class="title-lockup">
          ${logoMark()}
          <h1><span>CLOUD</span><span>POST!</span></h1>
        </div>
        <p class="title-tagline">${ONBOARDING_LINE}</p>
        <button class="start-button primary-button" type="button">
          <span>START SHIFT</span>${icon('arrow')}
        </button>
        <p class="start-hint"><span class="key-hint"><kbd>ENTER</kbd> OR </span>TAP TO CLOCK IN</p>
      </div>
      <div class="demo-status"><span class="live-dot"></span> LIVE DEMO <i>•</i> AUTO-PLAYING</div>
      <div class="title-tools">
        <button class="round-button sound-button" type="button" aria-label="Mute sound" aria-pressed="true">${icon('sound')}</button>
        <button class="round-button leaderboard-button" type="button" aria-label="Open local leaderboard">${icon('trophy')}</button>
      </div>`;

    this.element.querySelector<HTMLButtonElement>('.start-button')?.addEventListener('click', () => this.onStart());
    this.element.querySelector<HTMLButtonElement>('.leaderboard-button')?.addEventListener('click', () => this.onLeaderboard());
    this.soundButton = this.element.querySelector<HTMLButtonElement>('.sound-button') as HTMLButtonElement;
    this.soundButton.addEventListener('click', () => {
      this.setSoundEnabled(!this.soundEnabled);
      this.onToggleSound();
    });
    window.addEventListener('keydown', this.handleKeyDown);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.element.classList.toggle('is-hidden', !visible);
    this.element.setAttribute('aria-hidden', String(!visible));
  }

  show(): void {
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  setSoundEnabled(enabled: boolean): void {
    this.applySound(enabled);
    this.onSound(enabled);
  }

  setMuted(muted: boolean): void {
    this.applySound(!muted);
  }

  private applySound(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.soundButton.innerHTML = icon(enabled ? 'sound' : 'muted');
    this.soundButton.setAttribute('aria-label', enabled ? 'Mute sound' : 'Enable sound');
    this.soundButton.setAttribute('aria-pressed', String(enabled));
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible || event.key !== 'Enter' || event.repeat) return;
    const target = event.target as HTMLElement | null;
    if (target?.matches('input, textarea, button')) return;
    event.preventDefault();
    this.onStart();
  };
}
