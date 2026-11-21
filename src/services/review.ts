import { FEATURES, REVIEW } from '../config/gameConfig';
import type { ReviewResult, ReviewStats } from '../game/types';

interface FallbackReview {
  when: (stats: ReviewStats) => boolean;
  title: string;
  review: (stats: ReviewStats) => string;
}

const FALLBACK_REVIEWS: readonly FallbackReview[] = [
  {
    when: (stats) => stats.perfect >= 8 || (stats.delivered >= 4 && stats.perfect / stats.delivered >= 0.8),
    title: 'Supreme Catapult Whiskers',
    review: (stats) => `${stats.perfect} bullseyes! The mailboxes have formally requested less showing off.`,
  },
  {
    when: (stats) => stats.fragileSmashed >= 3,
    title: 'Certified Teacup Menace',
    review: (stats) => `${stats.fragileSmashed} fragile parcels became modern art; handle the next tea set with your paws, not gravity.`,
  },
  {
    when: (stats) => stats.missed >= 6,
    title: 'Cloud Parcel Redistribution Officer',
    review: (stats) => `${stats.missed} parcels are now sightseeing below the clouds; aim for the islands next time.`,
  },
  {
    when: (stats) => stats.maxStreak >= 8,
    title: 'Director of Uninterruptible Delivery',
    review: (stats) => `A ${stats.maxStreak}-parcel streak! Your whiskers were basically a postal assembly line.`,
  },
  {
    when: (stats) => stats.delivered === 0,
    title: 'Junior Cloud Feeding Associate',
    review: () => 'A bold zero-delivery strategy: the clouds are full, the customers are confused, and practice is strongly advised.',
  },
  {
    when: (stats) => stats.perfect === 0 && stats.delivered >= 4,
    title: 'Rim Landing Enthusiast',
    review: (stats) => `All ${stats.delivered} deliveries arrived without one bullseye; the mailbox is starting to take it personally.`,
  },
  {
    when: (stats) => stats.missed === 0 && stats.delivered > 0,
    title: 'Zero-Pawblem Postal Specialist',
    review: (stats) => `${stats.delivered} delivered and nothing dropped: an immaculate shift with suspiciously tidy paws.`,
  },
  {
    when: (stats) => stats.feverUsed === 0 && stats.delivered >= 4,
    title: 'Fever Battery Hoarder',
    review: () => 'You saved Fever for a very special occasion that apparently never came; the tube appreciates your restraint.',
  },
  {
    when: (stats) => stats.feverUsed >= 2,
    title: 'Double-Espresso Delivery Dynamo',
    review: (stats) => `${stats.feverUsed} Fever activations kept the shift sparkling; the belt may need a little lie-down.`,
  },
  {
    when: (stats) => stats.feverUsed === 1,
    title: 'Golden Hour Parcel Puncher',
    review: () => 'One well-timed Fever, twice the points, and absolutely no need for a modest victory dance.',
  },
  {
    when: (stats) => stats.delivered > 0 && stats.perfect / stats.delivered >= 0.5,
    title: 'Mailbox Whisperer',
    review: (stats) => `${stats.perfect} perfect landings out of ${stats.delivered} deliveries proves you speak fluent mailbox.`,
  },
  {
    when: (stats) => stats.delivered >= 12,
    title: 'Chief Conveyor Wrangler',
    review: (stats) => `${stats.delivered} parcels processed in one tiny shift; Human Resources has sent another conveyor and a biscuit.`,
  },
  {
    when: (stats) => stats.grade === 'S+' || stats.grade === 'S',
    title: 'Postmaster of Extremely Fine Air Mail',
    review: (stats) => `${stats.score} points earned with grade ${stats.grade} precision; the owl is updating your office to a larger cloud.`,
  },
  {
    when: (stats) => stats.fragileSmashed > 0,
    title: 'Part-Time Clay Confetti Maker',
    review: (stats) => `${stats.fragileSmashed} fragile mishap${stats.fragileSmashed === 1 ? '' : 's'} aside, the cleanup clouds found you very considerate.`,
  },
  {
    when: (stats) => stats.maxStreak >= 4,
    title: 'Combo Parcel Connoisseur',
    review: (stats) => `Your best streak reached ${stats.maxStreak}; consistency looks good under that postal cap.`,
  },
  {
    when: (stats) => stats.missed >= 2,
    title: 'Express Cloud Subscription Agent',
    review: (stats) => `${stats.missed} misses mean several clouds now receive complimentary parcels; customer addresses remain optional.`,
  },
  {
    when: (stats) => stats.score < 500,
    title: 'Trainee of Humble Beginnings',
    review: (stats) => `${stats.score} points is officially a start; even the finest postal cats once missed their first mailbox.`,
  },
  {
    when: (stats) => stats.delivered > stats.perfect,
    title: 'Reliable Rim & Rescue Courier',
    review: (stats) => `${stats.delivered} deliveries made it home, even if ${stats.delivered - stats.perfect} chose the scenic island-rim entrance.`,
  },
  {
    when: () => true,
    title: 'Assistant to the Regional Owl',
    review: (stats) => `You posted ${stats.score} points, ${stats.perfect} bullseyes, and just enough chaos to keep the receipt interesting.`,
  },
];

function localReview(stats: ReviewStats): ReviewResult {
  const fallback = FALLBACK_REVIEWS.find((candidate) => candidate.when(stats)) ?? FALLBACK_REVIEWS[FALLBACK_REVIEWS.length - 1];
  return { title: fallback.title, review: fallback.review(stats) };
}

function parseReview(value: unknown): ReviewResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid review payload');
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 2 || !keys.includes('title') || !keys.includes('review')) {
    throw new Error('Invalid review fields');
  }
  if (typeof record.title !== 'string' || typeof record.review !== 'string') {
    throw new Error('Invalid review values');
  }

  const title = record.title.trim();
  const review = record.review.trim();
  if (title.length === 0 || review.length === 0 || title.length > 120 || review.length > 600) {
    throw new Error('Invalid review content');
  }
  return { title, review };
}

export async function getReview(stats: ReviewStats): Promise<ReviewResult> {
  if (!FEATURES.kimiReview) return localReview(stats);

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('Review timed out'));
    }, REVIEW.timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetch(`${import.meta.env.BASE_URL}api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats),
        signal: controller.signal,
      }),
      timeout,
    ]);
    if (!response.ok) throw new Error('Review request failed');
    const payload: unknown = await Promise.race([response.json(), timeout]);
    return parseReview(payload);
  } catch {
    return localReview(stats);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}
