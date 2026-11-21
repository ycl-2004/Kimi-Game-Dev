import { CHORDS, FEVER, GAMEPLAY, ISLANDS } from '../config/gameConfig';
import type { GameSnapshot, ParcelState, ResultEvent } from '../game/types';
import { icon, owlPortrait } from './icons';

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing HUD element: ${selector}`);
  return element;
}

function setText(element: Element, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}

function percent(value: number): string {
  return `${Math.max(0, Math.min(1, value)) * 100}%`;
}

const CONSOLE_ISLANDS = ISLANDS.filter((island) => island.inputs.length === 1);
const CHORD_ISLANDS = ISLANDS.filter((island) => island.inputs.length === 2);

export class Hud {
  readonly element: HTMLElement;
  onFever: () => void = () => undefined;
  onSound: (enabled: boolean) => void = () => undefined;
  onToggleSound: () => void = () => undefined;

  private readonly ticket: HTMLElement;
  private readonly ticketIcon: HTMLElement;
  private readonly ticketIsland: HTMLElement;
  private readonly ticketType: HTMLElement;
  private readonly ticketKey: HTMLElement;
  private readonly ticketNext: HTMLElement;
  private readonly ticketFooterLabel: HTMLElement;
  private readonly expressTimer: HTMLElement;
  private readonly timeValue: HTMLElement;
  private readonly scoreValue: HTMLElement;
  private readonly comboValue: HTMLElement;
  private readonly multiplierValue: HTMLElement;
  private readonly owlBubble: HTMLElement;
  private readonly powerBar: HTMLElement;
  private readonly greenBand: HTMLElement;
  private readonly goldBand: HTMLElement;
  private readonly needle: HTMLElement;
  private readonly powerHint: HTMLElement;
  private readonly zoneLabel: HTMLElement;
  private readonly feverButton: HTMLButtonElement;
  private readonly feverFill: HTMLElement;
  private readonly feverStatus: HTMLElement;
  private readonly consoleButtons: HTMLButtonElement[];
  private readonly chordButtons: HTMLButtonElement[];
  private readonly consoleGuidance: HTMLElement;
  private readonly resultToast: HTMLElement;
  private resultTimer = 0;
  private lastMultiplier = 1;
  private lastOwlText = '';
  private soundEnabled = true;
  private soundButton!: HTMLButtonElement;
  private ticketSignature = '';
  private queueSignature = '';
  private chordHint: { parcelId: number; islandId: number; expiresAt: number } | null = null;

  constructor() {
    this.element = document.createElement('section');
    this.element.className = 'hud is-hidden';
    this.element.setAttribute('aria-label', 'Gameplay HUD');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.innerHTML = `
      <div class="owl-cluster">
        <div class="owl-badge">${owlPortrait()}</div>
        <div class="owl-bubble" role="status">Shift starts! Hold and release!</div>
      </div>

      <div class="parcel-ticket">
        <div class="ticket-rail"><span></span><span></span></div>
        <div class="ticket-heading"><span>NEXT DELIVERY</span><span class="ticket-key">1</span></div>
        <div class="ticket-main">
          <div class="ticket-destination-icon"></div>
          <div class="ticket-copy"><strong class="ticket-island">CAKE ISLE</strong><span class="ticket-type">NORMAL</span></div>
          <div class="express-timer" hidden><span>6</span><small>s</small></div>
        </div>
        <div class="ticket-footer"><span class="ticket-footer-label">NEXT UP</span><div class="ticket-next"></div></div>
      </div>

      <div class="hud-pills" aria-label="Run statistics">
        <div class="hud-pill time-pill">${icon('clock')}<span class="pill-label">TIME</span><strong class="time-value">0:30</strong></div>
        <div class="hud-pill score-pill"><span class="pill-label">SCORE</span><strong class="score-value">0</strong></div>
        <div class="hud-pill combo-pill"><strong class="combo-value">x0</strong><span class="pill-label">COMBO</span></div>
        <div class="hud-pill multiplier-pill"><strong class="multiplier-value">x1</strong><span class="pill-label">POINTS</span></div>
      </div>

      <aside class="power-wrap" aria-label="Throw power">
        <div class="power-caption"><span>POWER</span>${icon('feather')}</div>
        <div class="power-bar">
          <span class="power-number power-max">100</span>
          <div class="power-track">
            <div class="power-green"></div>
            <div class="power-gold"><span>PERFECT</span></div>
            <div class="power-needle"><span></span></div>
          </div>
          <span class="power-number power-min">0</span>
          <span class="power-label power-weak">TOO WEAK</span>
          <span class="power-label power-strong">TOO STRONG</span>
        </div>
        <div class="zone-label">CAKE ISLE</div>
        <div class="power-hint">HOLD TO CHARGE</div>
      </aside>

      <button class="fever-tube" type="button" aria-label="Fever meter, not ready" disabled>
        <span class="fever-title">FEVER</span>
        <span class="fever-glass"><span class="fever-liquid"></span><i></i><i></i><i></i></span>
        <span class="fever-status">0 / ${FEVER.deliveriesToFill}</span>
        <span class="fever-key">SPACE</span>
      </button>

      <button class="round-button hud-sound" type="button" aria-label="Mute sound" aria-pressed="true">${icon('sound')}</button>
      <div class="result-toast" role="status" aria-live="polite"></div>

      <div class="console-wrap">
        <div class="console-label"><span class="console-guidance">INCOMING…</span></div>
        <div class="console-buttons">
          ${CONSOLE_ISLANDS.map((island) => `
            <button class="console-button console-${island.id}" type="button" data-input="${island.inputs[0]}" style="--island-color:${island.color}" aria-label="Hold for ${island.name}">
              <span class="console-key">${island.inputs.join('+')}</span>
              ${icon(island.icon)}
              <span class="console-name">${island.short}</span>
              <span class="console-action">HOLD</span>
            </button>`).join('')}
          ${CHORD_ISLANDS.map((island) => `
            <button class="chord-bridge" type="button" data-chord="${island.inputs.join(',')}" data-island="${island.id}" aria-label="Hold ${island.inputs.join('+')} for ${island.name}">
              <span class="console-key">${island.inputs.join('+')}</span>
              ${icon(island.icon)}
            </button>`).join('')}
        </div>
      </div>`;

    this.ticket = required(this.element, '.parcel-ticket');
    this.ticketIcon = required(this.element, '.ticket-destination-icon');
    this.ticketIsland = required(this.element, '.ticket-island');
    this.ticketType = required(this.element, '.ticket-type');
    this.ticketKey = required(this.element, '.ticket-key');
    this.ticketNext = required(this.element, '.ticket-next');
    this.ticketFooterLabel = required(this.element, '.ticket-footer-label');
    this.expressTimer = required(this.element, '.express-timer');
    this.timeValue = required(this.element, '.time-value');
    this.scoreValue = required(this.element, '.score-value');
    this.comboValue = required(this.element, '.combo-value');
    this.multiplierValue = required(this.element, '.multiplier-value');
    this.owlBubble = required(this.element, '.owl-bubble');
    this.powerBar = required(this.element, '.power-bar');
    this.greenBand = required(this.element, '.power-green');
    this.goldBand = required(this.element, '.power-gold');
    this.needle = required(this.element, '.power-needle');
    this.powerHint = required(this.element, '.power-hint');
    this.zoneLabel = required(this.element, '.zone-label');
    this.feverButton = required(this.element, '.fever-tube');
    this.feverFill = required(this.element, '.fever-liquid');
    this.feverStatus = required(this.element, '.fever-status');
    this.consoleButtons = Array.from(this.element.querySelectorAll<HTMLButtonElement>('.console-button'));
    this.chordButtons = Array.from(this.element.querySelectorAll<HTMLButtonElement>('.chord-bridge'));
    this.consoleGuidance = required(this.element, '.console-guidance');
    this.resultToast = required(this.element, '.result-toast');
    this.soundButton = required(this.element, '.hud-sound');

    this.feverButton.addEventListener('click', () => {
      if (!this.feverButton.disabled) this.onFever();
    });
    this.consoleButtons.forEach((button) => {
      button.addEventListener('contextmenu', (event) => event.preventDefault());
      button.addEventListener('dragstart', (event) => event.preventDefault());
    });
    this.soundButton.addEventListener('click', () => {
      this.setSoundEnabled(!this.soundEnabled);
      this.onToggleSound();
    });
  }

  update(snapshot: GameSnapshot): void {
    const remaining = Math.max(0, Math.ceil(snapshot.remaining));
    setText(this.timeValue, `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`);
    setText(this.scoreValue, Math.round(snapshot.score).toLocaleString('en-US'));
    setText(this.comboValue, `x${snapshot.combo}`);
    setText(this.multiplierValue, `x${snapshot.multiplier}`);
    this.element.classList.toggle('is-urgent', remaining <= 10 && snapshot.mode === 'playing');

    if (snapshot.multiplier !== this.lastMultiplier) {
      this.lastMultiplier = snapshot.multiplier;
      const pill = this.multiplierValue.parentElement;
      pill?.classList.remove('is-popping');
      void this.multiplierValue.offsetWidth;
      pill?.classList.add('is-popping');
    }

    if (snapshot.owlText !== this.lastOwlText) {
      this.lastOwlText = snapshot.owlText;
      setText(this.owlBubble, snapshot.owlText);
      this.owlBubble.classList.remove('is-bouncing');
      void this.owlBubble.offsetWidth;
      this.owlBubble.classList.add('is-bouncing');
    }

    this.updateTicket(snapshot);
    const chordHint = this.getChordHint(snapshot);
    this.updatePower(snapshot, chordHint);
    this.updateFever(snapshot);

    const targetIsland = ISLANDS.find((island) => island.id === snapshot.frontParcel?.targetIslandId) ?? ISLANDS[0];
    const chargingIsland = ISLANDS.find((island) => island.id === snapshot.charging?.islandId);
    const targetKeys = targetIsland.inputs.join('+');
    setText(this.consoleGuidance, chordHint ?? (snapshot.parcelReady
      ? `HOLD ${targetKeys} · ${targetIsland.name.toUpperCase()}`
      : `INCOMING · ${targetKeys} · ${targetIsland.name.toUpperCase()}`));
    this.element.classList.toggle('is-parcel-ready', snapshot.parcelReady);
    this.element.classList.toggle('stage-two', snapshot.allowChords);
    this.element.dataset.stage = snapshot.stageId;

    this.consoleButtons.forEach((button, index) => {
      const island = CONSOLE_ISLANDS[index];
      const input = island.inputs[0];
      const held = chargingIsland?.inputs.some((key) => key === input) ?? false;
      const target = snapshot.frontParcel !== null && targetIsland.inputs.some((key) => key === input);
      button.classList.toggle('is-held', held);
      button.classList.toggle('is-target', target);
      button.classList.toggle('is-chord-key', target && targetIsland.inputs.length > 1);
      button.disabled = snapshot.stageTransition !== null;
      button.setAttribute('aria-pressed', String(held));
    });

    this.chordButtons.forEach((button) => {
      const islandId = Number(button.dataset.island);
      const held = snapshot.charging?.islandId === islandId;
      const target = snapshot.frontParcel?.targetIslandId === islandId;
      button.classList.toggle('is-held', held);
      button.classList.toggle('is-target', target);
      button.disabled = snapshot.stageTransition !== null;
      button.setAttribute('aria-pressed', String(held));
    });
  }

  setVisible(visible: boolean): void {
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

  showChordHint(parcel: ParcelState): void {
    this.chordHint = {
      parcelId: parcel.id,
      islandId: parcel.targetIslandId,
      expiresAt: performance.now() + CHORDS.hintDuration * 1000,
    };
  }

  private applySound(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.soundButton.innerHTML = icon(enabled ? 'sound' : 'muted');
    this.soundButton.setAttribute('aria-label', enabled ? 'Mute sound' : 'Enable sound');
    this.soundButton.setAttribute('aria-pressed', String(enabled));
  }

  showResult(event: ResultEvent): void {
    window.clearTimeout(this.resultTimer);
    const smashed = event.kind === 'TOO STRONG' && event.parcel.type === 'FRAGILE';
    const heading = smashed ? 'FRAGILE SMASHED!' : `${event.kind}!`;
    this.resultToast.innerHTML = `<strong>${heading}</strong>${event.scoreAwarded > 0 ? `<span>+${event.scoreAwarded.toLocaleString('en-US')}</span>` : '<span>STREAK RESET</span>'}`;
    this.resultToast.className = `result-toast is-visible ${event.kind === 'PERFECT' ? 'is-perfect' : event.kind === 'GOOD' ? 'is-good' : 'is-miss'}`;
    void this.resultToast.offsetWidth;
    this.resultToast.classList.add('is-animating');
    this.resultTimer = window.setTimeout(() => {
      this.resultToast.classList.remove('is-visible', 'is-animating');
    }, 1150);
  }

  private updateTicket(snapshot: GameSnapshot): void {
    const parcel = snapshot.frontParcel;
    this.ticket.classList.toggle('is-empty', !parcel);
    if (!parcel) {
      if (this.ticketSignature !== 'empty') {
        this.ticketSignature = 'empty';
        this.queueSignature = '';
        this.ticketIcon.innerHTML = icon('parcel');
        setText(this.ticketIsland, 'NEXT PARCEL…');
        setText(this.ticketType, 'IN TRANSIT');
        setText(this.ticketKey, '—');
        this.ticketType.dataset.type = 'NORMAL';
        this.ticketNext.replaceChildren();
      }
      this.expressTimer.hidden = true;
      setText(this.ticketFooterLabel, 'ONE AT A TIME');
      return;
    }

    const island = ISLANDS.find((item) => item.id === parcel.targetIslandId) ?? ISLANDS[0];
    const ticketSignature = `${parcel.id}:${parcel.type}:${parcel.targetIslandId}`;
    if (ticketSignature !== this.ticketSignature) {
      this.ticketSignature = ticketSignature;
      this.ticketIcon.innerHTML = icon(island.icon);
      this.ticket.style.setProperty('--island-color', island.color);
      setText(this.ticketIsland, island.name.toUpperCase());
      setText(this.ticketType, parcel.type);
      this.ticketType.dataset.type = parcel.type;
      setText(this.ticketKey, island.inputs.join('+'));
      this.ticket.dataset.type = parcel.type;
    }

    this.expressTimer.hidden = parcel.expressRemaining === null;
    if (parcel.expressRemaining !== null) {
      const seconds = Math.max(0, Math.ceil(parcel.expressRemaining));
      setText(this.expressTimer.querySelector('span') as HTMLElement, String(seconds));
      const ratio = Math.max(0, Math.min(1, parcel.expressRemaining / GAMEPLAY.expressDuration));
      this.expressTimer.style.setProperty('--countdown', `${ratio * 360}deg`);
    }

    const upcoming = snapshot.queue.filter((item) => item.id !== parcel.id).slice(0, 2);
    setText(this.ticketFooterLabel, upcoming.length === 0 ? 'ONE AT A TIME' : 'NEXT UP');
    const queueSignature = upcoming.map((item) => `${item.id}:${item.type}:${item.targetIslandId}`).join('|');
    if (queueSignature !== this.queueSignature) {
      this.queueSignature = queueSignature;
      this.ticketNext.innerHTML = upcoming.map((item) => {
        const target = ISLANDS.find((entry) => entry.id === item.targetIslandId) ?? ISLANDS[0];
        return `<span class="next-parcel" data-type="${item.type}" style="--target-color:${target.color}" title="${item.type} to ${target.name}">${icon(item.type.toLowerCase())}<b>${target.inputs.join('+')}</b></span>`;
      }).join('');
    }
  }

  private getChordHint(snapshot: GameSnapshot): string | null {
    if (!this.chordHint) return null;
    if (snapshot.frontParcel?.id !== this.chordHint.parcelId || performance.now() >= this.chordHint.expiresAt) {
      this.chordHint = null;
      return null;
    }
    const island = ISLANDS.find((item) => item.id === this.chordHint?.islandId);
    return island ? `PRESS ${island.inputs.join('+')} TOGETHER` : null;
  }

  private updatePower(snapshot: GameSnapshot, chordHint: string | null): void {
    const { zone } = snapshot;
    this.greenBand.style.bottom = percent(zone.center - zone.greenHalfWidth);
    this.greenBand.style.height = percent(zone.greenHalfWidth * 2);
    this.goldBand.style.bottom = percent(zone.center - zone.goldHalfWidth);
    this.goldBand.style.height = percent(zone.goldHalfWidth * 2);
    this.needle.style.bottom = percent(snapshot.charging?.power ?? 0);
    this.powerBar.classList.toggle('is-charging', snapshot.charging !== null);
    const hint = chordHint ?? (snapshot.charging ? 'RELEASE TO THROW' : snapshot.parcelReady ? 'HOLD TO CHARGE' : 'INCOMING…');
    setText(this.powerHint, hint);
    this.powerHint.classList.toggle('is-active', snapshot.charging !== null);
    this.powerHint.classList.toggle('is-waiting', !snapshot.parcelReady);
    const island = ISLANDS.find((item) => item.id === snapshot.zoneIslandId) ?? ISLANDS[0];
    setText(this.zoneLabel, island.name.toUpperCase());
  }

  private updateFever(snapshot: GameSnapshot): void {
    const rawProgress = Math.max(0, Math.min(1, snapshot.feverProgress));
    const progress = snapshot.feverActive ? snapshot.feverRemaining / FEVER.duration : snapshot.feverFilled ? 1 : rawProgress;
    this.feverFill.style.height = percent(progress);
    this.feverButton.classList.toggle('is-ready', snapshot.feverFilled && !snapshot.feverActive);
    this.feverButton.classList.toggle('is-active', snapshot.feverActive);
    this.feverButton.disabled = !snapshot.feverFilled || snapshot.feverActive;
    this.element.classList.toggle('fever-active', snapshot.feverActive);

    const chargeCount = Math.round(rawProgress * FEVER.deliveriesToFill);
    const status = snapshot.feverActive ? `${Math.ceil(snapshot.feverRemaining)}s · 2×` : snapshot.feverFilled ? 'TAP!' : `${chargeCount} / ${FEVER.deliveriesToFill}`;
    setText(this.feverStatus, status);
    this.feverButton.setAttribute('aria-label', snapshot.feverActive ? `Fever active, ${Math.ceil(snapshot.feverRemaining)} seconds left` : snapshot.feverFilled ? 'Activate Fever' : `Fever meter, ${status}`);
  }
}
