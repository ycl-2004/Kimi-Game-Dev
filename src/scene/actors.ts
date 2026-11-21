import * as THREE from 'three';
import { BELT, PALETTE } from '../config/gameConfig';
import { ClayFactory } from './ClayFactory';

export const LAUNCH_POSITION = new THREE.Vector3(BELT.launchX, 2.15, 4.8);
export const BELT_START_X = BELT.startX;
export const BELT_END_X = BELT.endX;

export interface ConveyorVisual {
  root: THREE.Group;
  slats: THREE.InstancedMesh;
  slatCount: number;
}

export interface CatVisual {
  root: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  leftEar: THREE.Mesh;
  rightEar: THREE.Mesh;
  tail: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
}

export function buildConveyor(factory: ClayFactory, slatCount: number): ConveyorVisual {
  const root = new THREE.Group();
  root.name = 'floating-conveyor-desk';

  const desk = factory.mesh(factory.rounded(18.2, 1.05, 4.15, 0.22), PALETTE.wood);
  desk.position.set(-4.55, 0.65, 4.8);
  root.add(desk);
  const belt = factory.mesh(factory.rounded(17.2, 0.28, 2.75, 0.13), PALETTE.ink);
  belt.position.set(-4.75, 1.28, 4.8);
  root.add(belt);

  const slats = new THREE.InstancedMesh(factory.rounded(0.48, 0.15, 2.55, 0.05), factory.material(PALETTE.wood), slatCount);
  slats.castShadow = true;
  slats.receiveShadow = true;
  slats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(slats);

  [-1.55, 1.55].forEach((zOffset) => {
    const rail = factory.mesh(factory.cylinder(0.09, 0.09, 17.8, 10), PALETTE.yellow);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(-4.55, 1.58, 4.8 + zOffset);
    root.add(rail);
  });

  const launchPad = factory.mesh(factory.rounded(1.9, 0.18, 3.05, 0.13), PALETTE.yellow);
  launchPad.position.set(2.9, 1.55, 4.8);
  root.add(launchPad);
  const launchStripe = factory.mesh(factory.rounded(0.18, 0.05, 2.6, 0.03), PALETTE.paper);
  launchStripe.position.set(2.9, 1.67, 4.8);
  root.add(launchStripe);

  [-10.8, -5.2, 0.4].forEach((x) => {
    const brace = factory.mesh(factory.rounded(1.1, 1.4, 2.8, 0.18), PALETTE.wood);
    brace.position.set(x, -0.25, 4.8);
    root.add(brace);
    const bolt = factory.mesh(factory.cylinder(0.18, 0.18, 0.12, 12), PALETTE.yellow);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(x, 0.55, 6.91);
    root.add(bolt);
  });

  return { root, slats, slatCount };
}

export function updateConveyor(visual: ConveyorVisual, offset: number): void {
  const length = BELT_END_X - BELT_START_X;
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < visual.slatCount; i += 1) {
    const x = BELT_START_X + ((i / visual.slatCount) * length + offset) % length;
    matrix.makeTranslation(x, 1.5, 4.8);
    visual.slats.setMatrixAt(i, matrix);
  }
  visual.slats.instanceMatrix.needsUpdate = true;
}

export function buildPostalCat(factory: ClayFactory): CatVisual {
  const root = new THREE.Group();
  root.name = 'postal-cat';
  root.position.set(4.75, 1.75, 4.65);

  const body = factory.mesh(factory.sphere(0.88, 20, 16), PALETTE.red);
  body.position.y = 0.85;
  body.scale.set(1, 1.12, 0.88);
  root.add(body);

  const head = new THREE.Group();
  head.position.y = 1.9;
  root.add(head);
  const face = factory.mesh(factory.sphere(0.79, 20, 16), PALETTE.red);
  face.scale.set(1.05, 0.94, 0.94);
  head.add(face);

  const leftEar = factory.mesh(factory.cone(0.34, 0.72, 12), PALETTE.red);
  leftEar.position.set(-0.45, 0.68, -0.03);
  leftEar.rotation.z = 0.14;
  head.add(leftEar);
  const rightEar = factory.mesh(factory.cone(0.34, 0.72, 12), PALETTE.red);
  rightEar.position.set(0.45, 0.68, -0.03);
  rightEar.rotation.z = -0.14;
  head.add(rightEar);

  const leftEye = factory.mesh(factory.sphere(0.078, 10, 8), PALETTE.ink);
  leftEye.position.set(-0.26, 0.08, 0.72);
  leftEye.scale.y = 1.3;
  head.add(leftEye);
  const rightEye = factory.mesh(factory.sphere(0.078, 10, 8), PALETTE.ink);
  rightEye.position.set(0.26, 0.08, 0.72);
  rightEye.scale.y = 1.3;
  head.add(rightEye);

  [-0.16, 0.16].forEach((x) => {
    const muzzle = factory.mesh(factory.sphere(0.23, 12, 8), PALETTE.paper);
    muzzle.position.set(x, -0.2, 0.67);
    muzzle.scale.set(1, 0.78, 0.65);
    head.add(muzzle);
  });
  const nose = factory.mesh(factory.sphere(0.075, 10, 8), PALETTE.ink);
  nose.position.set(0, -0.12, 0.84);
  head.add(nose);

  [-1, 1].forEach((side) => {
    const whisker = factory.mesh(factory.capsule(0.018, 0.38), PALETTE.ink);
    whisker.rotation.z = Math.PI / 2;
    whisker.position.set(side * 0.5, -0.22, 0.69);
    head.add(whisker);
  });

  const cap = factory.mesh(factory.rounded(0.98, 0.3, 0.83, 0.16), PALETTE.blue);
  cap.position.set(0, 0.68, 0);
  head.add(cap);
  const capBand = factory.mesh(factory.cylinder(0.59, 0.64, 0.2, 16), PALETTE.blue);
  capBand.position.set(0, 0.53, 0);
  head.add(capBand);
  const brim = factory.mesh(factory.rounded(0.8, 0.1, 0.42, 0.08), PALETTE.blue);
  brim.position.set(0, 0.48, 0.52);
  head.add(brim);
  const capBadge = factory.mesh(factory.rounded(0.27, 0.18, 0.04, 0.035), PALETTE.paper);
  capBadge.position.set(0, 0.69, 0.43);
  head.add(capBadge);

  [-0.22, 0, 0.22].forEach((x) => {
    const stripe = factory.mesh(factory.rounded(0.09, 0.28, 0.045, 0.025), PALETTE.ink);
    stripe.position.set(x, 0.48, 0.63);
    stripe.rotation.x = -0.35;
    head.add(stripe);
  });

  const leftArm = factory.mesh(factory.capsule(0.18, 0.52), PALETTE.red);
  leftArm.position.set(-0.86, 0.9, 0.12);
  leftArm.rotation.z = -0.3;
  root.add(leftArm);
  const rightArm = factory.mesh(factory.capsule(0.18, 0.52), PALETTE.red);
  rightArm.position.set(0.86, 0.9, 0.12);
  rightArm.rotation.z = 0.3;
  root.add(rightArm);

  [-0.44, 0.44].forEach((x) => {
    const paw = factory.mesh(factory.sphere(0.32, 12, 8), PALETTE.red);
    paw.position.set(x, 0.05, 0.25);
    paw.scale.set(1, 0.65, 1.25);
    root.add(paw);
  });

  const tail = new THREE.Group();
  tail.position.set(-0.82, 0.65, -0.35);
  root.add(tail);
  const tailMesh = factory.mesh(factory.torus(0.58, 0.14, Math.PI * 1.35), PALETTE.red);
  tailMesh.rotation.set(0.25, 0.55, -0.5);
  tail.add(tailMesh);

  const mailBag = factory.mesh(factory.rounded(0.62, 0.7, 0.35, 0.12), PALETTE.wood);
  mailBag.position.set(0.75, 0.62, -0.52);
  root.add(mailBag);

  return { root, body, head, leftEye, rightEye, leftEar, rightEar, tail, leftArm, rightArm };
}

export function buildCloudSea(factory: ClayFactory, puffCount: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'cloud-sea';
  const clouds = new THREE.InstancedMesh(factory.sphere(1, 12, 8), factory.material(PALETTE.paper), puffCount);
  clouds.castShadow = false;
  clouds.receiveShadow = false;
  const dummy = new THREE.Object3D();
  let seed = 92821;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < puffCount; i += 1) {
    dummy.position.set((random() - 0.5) * 90, -4.6 + random() * 1.6, 18 - random() * 86);
    dummy.scale.set(2.2 + random() * 4.4, 0.7 + random() * 1.2, 1.8 + random() * 3.6);
    dummy.rotation.y = random() * Math.PI;
    dummy.updateMatrix();
    clouds.setMatrixAt(i, dummy.matrix);
  }
  root.add(clouds);
  return root;
}
