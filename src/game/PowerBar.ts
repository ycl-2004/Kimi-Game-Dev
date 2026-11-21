import { FEVER, PARCEL_TYPES, POWER } from '../config/gameConfig';
import type { ParcelType, PowerZone, ResultKind } from './types';

export function needleAt(elapsed: number, speed: number): number {
  const cycle = ((elapsed * speed) % 2 + 2) % 2;
  return cycle <= 1 ? cycle : 2 - cycle;
}

export function zoneFor(islandDistance: number, parcelType: ParcelType, feverActive: boolean): PowerZone {
  const parcel = PARCEL_TYPES[parcelType];
  const center = POWER.nearZoneCenter + (POWER.farZoneCenter - POWER.nearZoneCenter) * Math.min(1, Math.max(0, islandDistance));
  return {
    center,
    greenHalfWidth: parcel.greenHalfWidth,
    goldHalfWidth: parcel.goldHalfWidth + (feverActive ? FEVER.goldHalfWidthBonus : 0),
  };
}

export function judge(power: number, zone: PowerZone): Extract<ResultKind, 'PERFECT' | 'GOOD' | 'TOO WEAK' | 'TOO STRONG'> {
  if (Math.abs(power - zone.center) <= zone.goldHalfWidth) return 'PERFECT';
  if (Math.abs(power - zone.center) <= zone.greenHalfWidth) return 'GOOD';
  return power < zone.center ? 'TOO WEAK' : 'TOO STRONG';
}

export function needleSpeedFor(parcelType: ParcelType, speedStep: number): number {
  const base = parcelType === 'EXPRESS' ? PARCEL_TYPES.EXPRESS.needleSpeed : POWER.baseSweepSpeed;
  return base * (1 + (speedStep - 1) * POWER.speedStepNeedleBonus);
}
