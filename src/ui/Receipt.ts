import { GRADES, RUN_LENGTH } from '../config/gameConfig';
import type { LeaderboardEntry, ReviewResult, RunStats } from '../game/types';
import { getLeaderboard, saveScore } from '../services/leaderboard';
import { getReview } from '../services/review';
import { icon, owlPortrait } from './icons';
import { renderLeaderboard } from './Leaderboard';

const NAME_STORAGE_KEY = 'cloud-post-name-v1';

function readSavedName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing receipt element: ${selector}`);
  return element;
}

export class Receipt {
  readonly element: HTMLElement;
  onPlayAgain: () => void = () => undefined;

  private readonly paper: HTMLElement;
  private readonly nameInput: HTMLInputElement;
  private readonly saveButton: HTMLButtonElement;
  private readonly reviewTitle: HTMLElement;
  private readonly reviewText: HTMLElement;
  private readonly leaderboardList: HTMLElement;
  private readonly rankNote: HTMLElement;
  private currentStats: RunStats | null = null;
  private currentGrade = 'C';
  private savedEntry: LeaderboardEntry | null = null;
  private reviewRequest = 0;
  private visible = false;

  constructor() {
    this.element = document.createElement('section');
    this.element.className = 'receipt-screen is-hidden';
    this.element.setAttribute('aria-label', 'Postal inspection receipt');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.innerHTML = `
      <div class="receipt-paper">
        <div class="receipt-tear receipt-tear-top"></div>
        <header class="receipt-header">
          <span>SPECIAL DELIVERY DIVISION</span>
          <h2>CLOUD POST!</h2>
          <p>POSTAL INSPECTION RECEIPT</p>
          <div class="receipt-meta"><span>SHIFT 01</span><span>${RUN_LENGTH} SECOND SERVICE</span></div>
        </header>
        <div class="receipt-scoreline">
          <div><span>FINAL SCORE</span><strong class="receipt-score">0</strong></div>
          <div class="grade-stamp"><small>GRADE</small><strong class="grade-value">C</strong></div>
        </div>
        <div class="receipt-stats">
          <div>${icon('parcel')}<span>PARCELS DELIVERED</span><strong data-stat="delivered">0</strong></div>
          <div>${icon('star')}<span>PERFECT BULLSEYES</span><strong data-stat="perfect">0</strong></div>
          <div>${icon('fragile')}<span>FRAGILE SMASHED</span><strong data-stat="fragileSmashed">0</strong></div>
          <div>${icon('close')}<span>DROPPED / MISSED</span><strong data-stat="missed">0</strong></div>
          <div class="streak-stat">${icon('feather')}<span>MAX STREAK</span><strong data-stat="maxStreak">0</strong></div>
        </div>
        <section class="review-box" aria-live="polite">
          <div class="review-heading">${owlPortrait()}<span>CHIEF INSPECTOR REVIEW</span><i>OFFICIAL-ish</i></div>
          <strong class="review-title">INSPECTING YOUR SHIFT…</strong>
          <p class="review-text">The owl is checking every stamp.</p>
        </section>
        <div class="score-save">
          <label for="postal-name">YOUR POSTAL NAME</label>
          <div class="save-row">
            <input id="postal-name" type="text" maxlength="16" autocomplete="nickname" spellcheck="false" placeholder="CAT" aria-label="Your postal name" />
            <button class="save-score-button" type="button">${icon('check')}<span>SAVE SCORE</span></button>
          </div>
          <p class="rank-note">Save your shift to the local top ten.</p>
        </div>
        <section class="receipt-leaderboard">
          <div class="receipt-section-title"><span>LOCAL LEADERBOARD</span>${icon('trophy')}</div>
          <div class="receipt-leaderboard-list"></div>
        </section>
        <button class="play-again-button primary-button" type="button"><span>PLAY AGAIN</span>${icon('arrow')}</button>
        <p class="receipt-footer">THANK YOU FOR FLYING CLOUD POST <span>✦</span> KEEP YOUR WHISKERS DRY</p>
        <div class="receipt-tear receipt-tear-bottom"></div>
      </div>`;

    this.paper = required(this.element, '.receipt-paper');
    this.nameInput = required(this.element, '#postal-name');
    this.saveButton = required(this.element, '.save-score-button');
    this.reviewTitle = required(this.element, '.review-title');
    this.reviewText = required(this.element, '.review-text');
    this.leaderboardList = required(this.element, '.receipt-leaderboard-list');
    this.rankNote = required(this.element, '.rank-note');
    this.nameInput.value = readSavedName();

    this.saveButton.addEventListener('click', () => this.save());
    required<HTMLButtonElement>(this.element, '.play-again-button').addEventListener('click', () => this.playAgain());
    window.addEventListener('keydown', this.handleKeyDown);
  }

  show(stats: RunStats): void {
    this.currentStats = { ...stats };
    this.currentGrade = this.gradeFor(stats.score);
    this.savedEntry = null;
    this.visible = true;
    this.reviewRequest += 1;
    const request = this.reviewRequest;

    this.element.classList.remove('is-hidden');
    this.element.setAttribute('aria-hidden', 'false');
    this.paper.scrollTop = 0;
    this.paper.classList.remove('is-printing');
    void this.paper.offsetWidth;
    this.paper.classList.add('is-printing');

    required(this.element, '.receipt-score').textContent = stats.score.toLocaleString('en-US');
    required(this.element, '.grade-value').textContent = this.currentGrade;
    required(this.element, '.grade-stamp').setAttribute('data-grade', this.currentGrade.replace('+', 'plus'));
    (['delivered', 'perfect', 'fragileSmashed', 'missed', 'maxStreak'] as const).forEach((key) => {
      required(this.element, `[data-stat="${key}"]`).textContent = String(stats[key]);
    });

    this.nameInput.readOnly = false;
    this.saveButton.disabled = false;
    this.saveButton.innerHTML = `${icon('check')}<span>SAVE SCORE</span>`;
    this.rankNote.textContent = 'Save your shift to the local top ten.';
    this.reviewTitle.textContent = 'INSPECTING YOUR SHIFT…';
    this.reviewText.textContent = 'The owl is checking every stamp.';
    this.reviewBoxLoading(true);
    renderLeaderboard(this.leaderboardList, getLeaderboard(), undefined, 5);

    getReview({ ...stats, name: this.postalName(), grade: this.currentGrade })
      .then((review) => this.applyReview(review, request))
      .catch(() => this.applyReview({
        title: 'CLOUD-HOPPING COURIER',
        review: 'A few bumps, plenty of heart, and every parcel filed under adventure.',
      }, request));
  }

  hide(): void {
    this.visible = false;
    this.reviewRequest += 1;
    this.element.classList.add('is-hidden');
    this.element.setAttribute('aria-hidden', 'true');
  }

  private gradeFor(score: number): string {
    const scale = RUN_LENGTH / 60;
    return GRADES.find((grade) => score >= grade.minimum * scale)?.grade ?? 'C';
  }

  private postalName(): string {
    return this.nameInput.value.trim().replace(/\s+/g, ' ').slice(0, 16) || 'CAT';
  }

  private save(): void {
    if (!this.currentStats || this.savedEntry) return;
    const name = this.postalName();
    this.nameInput.value = name;
    try {
      localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch {
    }

    const result = saveScore(name, this.currentStats.score, this.currentGrade);
    this.savedEntry = result.entry;
    this.nameInput.readOnly = true;
    this.saveButton.disabled = true;
    this.saveButton.innerHTML = `${icon('check')}<span>SAVED</span>`;
    const rank = result.entries.findIndex((entry) => entry.id === result.entry.id) + 1;
    this.rankNote.textContent = rank > 0 ? `Stamped! You are local rank #${rank}.` : 'Shift saved on this device.';
    renderLeaderboard(this.leaderboardList, result.entries, result.entry.id, 5);
  }

  private applyReview(review: ReviewResult, request: number): void {
    if (request !== this.reviewRequest || !this.visible) return;
    this.reviewTitle.textContent = review.title;
    this.reviewText.textContent = review.review;
    this.reviewBoxLoading(false);
  }

  private reviewBoxLoading(loading: boolean): void {
    required(this.element, '.review-box').classList.toggle('is-loading', loading);
  }

  private playAgain(): void {
    this.hide();
    this.onPlayAgain();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible || event.key !== 'Enter' || event.repeat) return;
    const target = event.target as HTMLElement | null;
    if (target?.matches('input, textarea, button')) return;
    event.preventDefault();
    this.playAgain();
  };
}
