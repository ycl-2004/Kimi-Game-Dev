import * as THREE from 'three';
import { GAMEPLAY, ISLANDS, PALETTE } from '../config/gameConfig';
import type { ParcelState, ParcelType } from '../game/types';
import { ClayFactory } from './ClayFactory';

export interface ParcelVisual {
  id: number;
  type: ParcelType;
  targetIslandId: number;
  group: THREE.Group;
  countdownTicks: THREE.Mesh[];
  countdownRing: THREE.Mesh | null;
}

let fragileTapeMaterial: THREE.MeshStandardMaterial | null = null;

export function buildParcel(factory: ClayFactory, parcel: ParcelState): ParcelVisual {
  const group = new THREE.Group();
  group.name = `parcel-${parcel.id}`;
  const visual: ParcelVisual = {
    id: parcel.id,
    type: parcel.type,
    targetIslandId: parcel.targetIslandId,
    group,
    countdownTicks: [],
    countdownRing: null,
  };

  if (parcel.type === 'FRAGILE') buildFragile(factory, group);
  else if (parcel.type === 'EXPRESS') buildExpress(factory, group, visual);
  else buildNormal(factory, group, parcel.targetIslandId);

  updateParcelCountdown(visual, parcel.expressRemaining);
  return visual;
}

export function updateParcelCountdown(visual: ParcelVisual, remaining: number | null): void {
  if (visual.type !== 'EXPRESS') return;
  const ratio = remaining === null ? 0 : THREE.MathUtils.clamp(remaining / GAMEPLAY.expressDuration, 0, 1);
  if (visual.countdownRing) visual.countdownRing.visible = remaining !== null;
  visual.countdownTicks.forEach((tick, index) => {
    tick.visible = remaining !== null && index / visual.countdownTicks.length < ratio;
  });
}

function buildNormal(factory: ClayFactory, group: THREE.Group, islandId: number): void {
  const box = factory.mesh(factory.rounded(1.18, 0.88, 1.02, 0.13), PALETTE.wood);
  group.add(box);
  const islandColor = ISLANDS.find((island) => island.id === islandId)?.color ?? PALETTE.mint;

  const ribbonTop = factory.mesh(factory.rounded(0.22, 0.06, 1.05, 0.025), islandColor);
  ribbonTop.position.y = 0.45;
  group.add(ribbonTop);
  const ribbonFront = factory.mesh(factory.rounded(0.22, 0.9, 0.055, 0.025), islandColor);
  ribbonFront.position.z = 0.52;
  group.add(ribbonFront);

  const badge = factory.mesh(factory.cylinder(0.23, 0.23, 0.055, 16), islandColor);
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0.34, 0.05, 0.55);
  group.add(badge);
  addIslandIcon(factory, group, islandId);
}

function buildFragile(factory: ClayFactory, group: THREE.Group): void {
  const crate = factory.mesh(factory.rounded(1.2, 0.94, 1.04, 0.1), PALETTE.blue, { transparent: true, opacity: 0.68 });
  group.add(crate);

  [-0.51, 0.51].forEach((x) => {
    [-0.43, 0.43].forEach((z) => {
      const edge = factory.mesh(factory.rounded(0.1, 1.02, 0.1, 0.025), PALETTE.paper);
      edge.position.set(x, 0, z);
      group.add(edge);
    });
  });
  const tape = new THREE.Mesh(factory.plane(0.92, 0.24), getFragileTapeMaterial());
  tape.position.set(0, -0.22, 0.526);
  group.add(tape);

  const cup = factory.mesh(factory.cylinder(0.17, 0.13, 0.28, 12), PALETTE.paper);
  cup.position.set(0.1, 0.61, 0);
  group.add(cup);
  const handle = factory.mesh(factory.torus(0.12, 0.035, Math.PI * 1.65), PALETTE.paper);
  handle.position.set(0.28, 0.64, 0);
  group.add(handle);
  const tea = factory.mesh(factory.cylinder(0.13, 0.13, 0.025, 12), PALETTE.wood);
  tea.position.set(0.1, 0.76, 0);
  group.add(tea);
}

function buildExpress(factory: ClayFactory, group: THREE.Group, visual: ParcelVisual): void {
  const box = factory.mesh(factory.rounded(1.2, 0.88, 1.02, 0.13), PALETTE.red);
  group.add(box);
  const band = factory.mesh(factory.rounded(0.22, 0.06, 1.06, 0.025), PALETTE.yellow);
  band.position.y = 0.45;
  group.add(band);

  [-1, 1].forEach((side) => {
    const wing = factory.mesh(factory.rounded(0.68, 0.12, 0.72, 0.08), PALETTE.paper);
    wing.position.set(side * 0.82, 0.04, -0.05);
    wing.rotation.z = side * -0.24;
    group.add(wing);
  });

  const rocket = factory.mesh(factory.cylinder(0.18, 0.18, 0.48, 12), PALETTE.ink);
  rocket.rotation.x = Math.PI / 2;
  rocket.position.set(0, -0.15, -0.68);
  group.add(rocket);
  const flame = factory.mesh(factory.cone(0.2, 0.48, 12), PALETTE.yellow, { emissive: PALETTE.yellow, emissiveIntensity: 0.2 });
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, -0.15, -1.12);
  group.add(flame);

  visual.countdownRing = factory.mesh(factory.torus(0.34, 0.045), PALETTE.ink);
  visual.countdownRing.rotation.x = Math.PI / 2;
  visual.countdownRing.position.set(0, 0.52, 0);
  group.add(visual.countdownRing);
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const tick = factory.mesh(factory.sphere(0.055, 8, 6), PALETTE.yellow, { emissive: PALETTE.yellow, emissiveIntensity: 0.2 });
    tick.position.set(Math.sin(angle) * 0.34, 0.54, Math.cos(angle) * 0.34);
    group.add(tick);
    visual.countdownTicks.push(tick);
  }
}

function addIslandIcon(factory: ClayFactory, group: THREE.Group, islandId: number): void {
  if (islandId === 0) {
    const cake = factory.mesh(factory.cylinder(0.08, 0.06, 0.12, 8), PALETTE.paper);
    cake.rotation.x = Math.PI / 2;
    cake.position.set(0.34, 0.03, 0.59);
    group.add(cake);
    const frosting = factory.mesh(factory.sphere(0.075, 8, 6), PALETTE.paper);
    frosting.position.set(0.34, 0.12, 0.59);
    group.add(frosting);
  } else if (islandId === 1) {
    const tower = factory.mesh(factory.rounded(0.09, 0.2, 0.04, 0.02), PALETTE.paper);
    tower.position.set(0.34, 0.05, 0.59);
    group.add(tower);
    const roof = factory.mesh(factory.cone(0.09, 0.11, 8), PALETTE.paper);
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0.34, 0.17, 0.59);
    group.add(roof);
  } else {
    const volcano = factory.mesh(factory.cone(0.11, 0.2, 8), PALETTE.paper);
    volcano.rotation.x = Math.PI / 2;
    volcano.position.set(0.34, 0.05, 0.59);
    group.add(volcano);
  }
}

function getFragileTapeMaterial(): THREE.MeshStandardMaterial {
  if (fragileTapeMaterial) return fragileTapeMaterial;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = PALETTE.paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = PALETTE.ink;
    context.font = '700 31px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('FRAGILE', 128, 34);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  fragileTapeMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.paper,
    map: texture,
    roughness: 0.78,
    metalness: 0.04,
  });
  return fragileTapeMaterial;
}
