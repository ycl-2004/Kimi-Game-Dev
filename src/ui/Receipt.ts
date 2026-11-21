import { GRADES, LEVELS } from '../config/gameConfig';
import type { LevelId, ReviewResult, RunResult } from '../game/types';
import { getLevelBest, saveLevelBest } from '../services/leaderboard';
import { getReview } from '../services/review';
import { icon, owlPortrait } from './icons';

const GRADE_TITLES = {
  'S+': 'Cloud Post Legend',
  S: 'Sky Courier',
  A: 'First-Class Flyer',
  B: 'Cloud Carrier',
  C: 'Postal Trainee',
} as const;

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing receipt element: ${selector}`);
  return element;
}

export class Receipt {
  readonly element: HTMLElement;
  onPlayAgain: () => void = () => undefined;
  onSelectLevel: (levelId: LevelId) => void = () => undefined;
  onEndShift: () => void = () => undefined;

  private readonly card: HTMLElement;
  private readonly paper: HTMLElement;
  private readonly practiceBest: HTMLElement;
  private readonly reviewTitle: HTMLElement;
  private readonly reviewText: HTMLElement;
  private reviewRequest = 0;
  private visible = false;

  constructor() {
    this.element = document.createElement('section');
    this.element.className = 'receipt-screen is-hidden';
    this.element.setAttribute('aria-label', 'Postal inspection receipt');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.innerHTML = `
      <div class="receipt-card">
        <div class="receipt-tear receipt-tear-top"></div>
        <div class="receipt-paper">
          <div class="receipt-summary">
            <header class="receipt-header">
              <span>SPECIAL DELIVERY DIVISION</span>
              <h2>CLOUD POST!</h2>
              <p class="receipt-kind">POSTAL INSPECTION RECEIPT</p>
              <div class="receipt-meta"><span class="receipt-shift">SHIFT 01</span><span class="receipt-duration"></span></div>
            </header>
            <div class="receipt-scoreline">
              <div><span>FINAL SCORE</span><strong class="receipt-score">0</strong></div>
              <div class="grade-stamp"><small>GRADE</small><strong class="grade-value">C</strong></div>
            </div>
            <div class="receipt-stats">
              <div>${icon('parcel')}<span>DELIVERED</span><strong data-stat="delivered">0</strong></div>
              <div>${icon('star')}<span>BULLSEYES</span><strong data-stat="perfect">0</strong></div>
              <div>${icon('feather')}<span>MAX STREAK</span><strong data-stat="maxStreak">0</strong></div>
              <div>${icon('express')}<span>FEVER USED</span><strong data-stat="feverUsed">0</strong></div>
              <div>${icon('fragile')}<span>SMASHED</span><strong data-stat="fragileSmashed">0</strong></div>
              <div>${icon('close')}<span>MISSED</span><strong data-stat="missed">0</strong></div>
            </div>
            <section class="review-box" aria-live="polite">
              <div class="review-heading">${owlPortrait()}<span>CHIEF INSPECTOR REVIEW</span><i>OFFICIAL-ish</i></div>
              <strong class="review-title">INSPECTING YOUR SHIFT…</strong>
              <p class="review-text">The owl is checking every stamp.</p>
            </section>
          </div>
          <div class="receipt-actions">
            <section class="grade-guide" aria-label="Score grade reference">
              <div class="receipt-section-title"><span>GRADE GUIDE · <b class="grade-guide-context">FULL SHIFT</b></span>${icon('star')}</div>
              <div class="grade-guide-rows"></div>
            </section>
            <section class="practice-best" hidden>
              <div class="receipt-section-title"><span class="practice-best-label">LOCAL BEST</span>${icon('trophy')}</div>
              <div class="practice-best-score"><strong class="practice-best-value">0</strong><span>THIS DEVICE ONLY</span></div>
              <p class="practice-best-note"></p>
            </section>
            <div class="receipt-choices">
              <button class="play-again-button primary-button" type="button"><span>REPLAY FULL SHIFT</span>${icon('arrow')}</button>
              <div class="level-choices" aria-label="Practice a single level">
                ${LEVELS.map((level) => `
                  <button class="level-choice level-choice-${level.id}" data-level="${level.id}" type="button">
                    <span>${level.name.toUpperCase()}</span><small>${level.duration}s · ×${level.multiplier}</small>
                  </button>`).join('')}
              </div>
              <button class="end-shift-button" type="button"><span>END SHIFT</span>${icon('close')}</button>
            </div>
          </div>
          <p class="receipt-footer">THANK YOU FOR FLYING CLOUD POST <span>✦</span> KEEP YOUR WHISKERS DRY</p>
        </div>
        <div class="receipt-tear receipt-tear-bottom"></div>
      </div>`;

    this.card = required(this.element, '.receipt-card');
    this.paper = required(this.element, '.receipt-paper');
    this.practiceBest = required(this.element, '.practice-best');
    this.reviewTitle = required(this.element, '.review-title');
    this.reviewText = required(this.element, '.review-text');

    this.element.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((button) => {
      const levelId = button.dataset.level as LevelId;
      const level = LEVELS.find((candidate) => candidate.id === levelId);
      button.addEventListener('click', () => {
        if (level) this.selectLevel(level.id);
      });
    });

    required<HTMLButtonElement>(this.element, '.play-again-button').addEventListener('click', () => this.playAgain());
    required<HTMLButtonElement>(this.element, '.end-shift-button').addEventListener('click', () => this.endShift());
    window.addEventListener('keydown', this.handleKeyDown);
  }

  show(result: RunResult): void {
    const stats = result.stats;
    const isFullRun = result.runKind === 'full';
    const level = LEVELS.find((candidate) => candidate.id === result.levelId);
    const currentGrade = this.gradeFor(stats.score, result.scoringDuration);
    this.visible = true;
    this.reviewRequest += 1;
    const request = this.reviewRequest;

    this.element.dataset.runKind = result.runKind;
    this.element.classList.remove('is-hidden');
    this.element.setAttribute('aria-hidden', 'false');
    this.paper.scrollTop = 0;
    this.card.classList.remove('is-printing');
    void this.card.offsetWidth;
    this.card.classList.add('is-printing');

    required(this.element, '.receipt-kind').textContent = isFullRun
      ? 'POSTAL INSPECTION RECEIPT'
      : `${level?.name.toUpperCase() ?? 'LEVEL'} PRACTICE RECEIPT`;
    required(this.element, '.receipt-shift').textContent = isFullRun
      ? 'FULL SHIFT 01'
      : `${level?.name.toUpperCase() ?? 'LEVEL'} PRACTICE`;
    required(this.element, '.receipt-duration').textContent = `${Math.round(result.totalDuration)}s SHIFT · ${Math.round(result.scoringDuration)}s SCORED`;
    required(this.element, '.receipt-score').textContent = stats.score.toLocaleString('en-US');
    required(this.element, '.grade-value').textContent = currentGrade;
    required(this.element, '.grade-stamp').setAttribute('data-grade', currentGrade.replace('+', 'plus'));
    (['delivered', 'perfect', 'fragileSmashed', 'missed', 'maxStreak', 'feverUsed'] as const).forEach((key) => {
      required(this.element, `[data-stat="${key}"]`).textContent = String(stats[key]);
    });

    this.practiceBest.hidden = isFullRun;
    this.showGradeGuide(result.scoringDuration, currentGrade, isFullRun ? 'FULL SHIFT' : `${level?.name.toUpperCase() ?? 'LEVEL'} PRACTICE`);
    this.reviewTitle.textContent = 'INSPECTING YOUR SHIFT…';
    this.reviewText.textContent = 'The owl is checking every stamp.';
    this.reviewBoxLoading(true);

    if (!isFullRun) this.showPracticeBest(result.levelId ?? null, level?.name ?? 'LEVEL', stats.score);

    getReview({ ...stats, name: 'Courier', grade: currentGrade })
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

  private gradeFor(score: number, scoringDuration: number): string {
    const scale = Math.max(0, scoringDuration) / 60;
    return GRADES.find((grade) => score >= grade.minimum * scale)?.grade ?? 'C';
  }

  private showGradeGuide(scoringDuration: number, currentGrade: string, context: string): void {
    const scale = Math.max(0, scoringDuration) / 60;
    required(this.element, '.grade-guide-context').textContent = context;
    required(this.element, '.grade-guide-rows').innerHTML = GRADES.map((grade) => {
      const isCurrent = grade.grade === currentGrade;
      return `
        <div class="grade-guide-row${isCurrent ? ' is-current' : ''}"${isCurrent ? ' aria-current="true"' : ''}>
          <strong class="grade-guide-letter">${grade.grade}</strong>
          <span class="grade-guide-name">${GRADE_TITLES[grade.grade]}${isCurrent ? '<small>YOUR GRADE</small>' : ''}</span>
          <span class="grade-guide-minimum">${Math.round(grade.minimum * scale).toLocaleString('en-US')}<small>+ PTS</small></span>
        </div>`;
    }).join('');
  }

  private showPracticeBest(levelId: LevelId | null, levelName: string, score: number): void {
    const previousBest = levelId ? getLevelBest(levelId) : 0;
    const best = levelId ? saveLevelBest(levelId, score) : score;
    required(this.element, '.practice-best-label').textContent = `${levelName.toUpperCase()} LOCAL BEST`;
    required(this.element, '.practice-best-value').textContent = best.toLocaleString('en-US');
    required(this.element, '.practice-best-note').textContent = score > previousBest
      ? previousBest > 0 ? `New best! Previous: ${previousBest.toLocaleString('en-US')}.` : 'First practice score stamped on this device.'
      : 'Your practice best is saved only on this device.';
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

  private selectLevel(levelId: LevelId): void {
    this.hide();
    this.onSelectLevel(levelId);
  }

  private endShift(): void {
    this.hide();
    this.onEndShift();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible || event.key !== 'Enter' || event.repeat) return;
    const target = event.target as HTMLElement | null;
    if (target?.matches('input, textarea, button')) return;
    event.preventDefault();
    this.playAgain();
  };
}
