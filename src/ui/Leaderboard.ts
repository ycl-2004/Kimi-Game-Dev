import { getLeaderboard } from '../services/leaderboard';
import type { LeaderboardEntry } from '../game/types';
import { icon, owlPortrait } from './icons';

export function renderLeaderboard(
  container: HTMLElement,
  entries: LeaderboardEntry[],
  highlightId?: string,
  limit = entries.length,
): void {
  container.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'leaderboard-empty';
    empty.textContent = 'No deliveries logged yet. Be the first!';
    container.append(empty);
    return;
  }

  const visibleEntries = entries.slice(0, limit);
  if (highlightId && !visibleEntries.some((entry) => entry.id === highlightId)) {
    const highlighted = entries.find((entry) => entry.id === highlightId);
    if (highlighted && visibleEntries.length > 0) visibleEntries[visibleEntries.length - 1] = highlighted;
  }

  visibleEntries.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    row.classList.toggle('is-player', entry.id === highlightId);

    const rank = document.createElement('span');
    rank.className = 'leaderboard-rank';
    rank.textContent = String(entries.findIndex((candidate) => candidate.id === entry.id) + 1).padStart(2, '0');
    const name = document.createElement('span');
    name.className = 'leaderboard-name';
    name.textContent = entry.name;
    const grade = document.createElement('strong');
    grade.className = 'leaderboard-grade';
    grade.textContent = entry.grade;
    const score = document.createElement('span');
    score.className = 'leaderboard-score';
    score.textContent = entry.score.toLocaleString('en-US');
    row.append(rank, name, grade, score);
    container.append(row);
  });
}

export class Leaderboard {
  readonly element: HTMLDialogElement;
  onClose: () => void = () => undefined;
  private readonly list: HTMLElement;

  constructor() {
    this.element = document.createElement('dialog');
    this.element.className = 'leaderboard-dialog';
    this.element.setAttribute('aria-labelledby', 'leaderboard-title');
    this.element.innerHTML = `
      <div class="leaderboard-sheet">
        <button class="round-button leaderboard-close" type="button" aria-label="Close leaderboard">${icon('close')}</button>
        <div class="leaderboard-heading">
          ${owlPortrait()}
          <div><span>OWL POSTMASTER'S</span><h2 id="leaderboard-title">TOP DELIVERIES</h2></div>
          ${icon('trophy', 'heading-trophy')}
        </div>
        <p class="leaderboard-subtitle">LOCAL RECORDS · THIS DEVICE ONLY</p>
        <div class="leaderboard-labels"><span>RANK</span><span>POSTAL NAME</span><span>GRADE</span><span>SCORE</span></div>
        <div class="leaderboard-list"></div>
        <p class="leaderboard-footnote">Ten finest shifts, stamped and filed.</p>
      </div>`;
    this.list = this.element.querySelector<HTMLElement>('.leaderboard-list') as HTMLElement;
    this.element.querySelector<HTMLButtonElement>('.leaderboard-close')?.addEventListener('click', () => this.close());
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.close();
    });
    this.element.addEventListener('close', () => this.onClose());
  }

  open(): void {
    this.refresh();
    if (!this.element.open) this.element.showModal();
  }

  show(): void {
    this.open();
  }

  close(): void {
    if (this.element.open) this.element.close();
  }

  hide(): void {
    this.close();
  }

  refresh(): void {
    renderLeaderboard(this.list, getLeaderboard());
  }
}
