import * as THREE from 'three';
import { PALETTE } from '../config/gameConfig';
import type { IslandDefinition } from '../game/types';
import { ClayFactory } from './ClayFactory';

export interface IslandVisual {
  definition: IslandDefinition;
  root: THREE.Group;
  mailTarget: THREE.Object3D;
  windmills: THREE.Group[];
  balloons: THREE.Group[];
  smokeRings: THREE.Mesh[];
  sparkles: THREE.Group[];
}

export function buildIsland(factory: ClayFactory, definition: IslandDefinition): IslandVisual {
  const root = new THREE.Group();
  root.name = `island-${definition.id}`;

  const underside = factory.mesh(factory.cylinder(2.75, 0.22, 3.4, 12), PALETTE.wood);
  underside.position.y = -1.9;
  root.add(underside);

  const rock = factory.mesh(factory.cylinder(3.45, 2.75, 1.05, 12), PALETTE.wood);
  rock.position.y = -0.15;
  root.add(rock);

  const turf = factory.mesh(factory.cylinder(3.5, 3.35, 0.48, 16), definition.color);
  turf.position.y = 0.52;
  root.add(turf);

  const visual: IslandVisual = {
    definition,
    root,
    mailTarget: new THREE.Object3D(),
    windmills: [],
    balloons: [],
    smokeRings: [],
    sparkles: [],
  };

  if (definition.icon === 'cupcake') buildCakeIsle(factory, root, visual);
  else if (definition.icon === 'lighthouse') buildCatHarbor(factory, root);
  else if (definition.icon === 'volcano') buildVolcanoSpa(factory, root, visual);
  else if (definition.icon === 'berry') buildBerryFarm(factory, root);
  else buildStarObservatory(factory, root, visual);

  buildMailbox(factory, root, visual.mailTarget);
  const balloonColor = definition.id === 0 ? PALETTE.yellow : definition.id === 1 ? PALETTE.cobalt : definition.color;
  buildBalloon(factory, root, visual, balloonColor, definition.id === 0 ? -4.25 : 4.15);
  addGroundDetails(factory, root, definition.id);

  root.add(visual.mailTarget);
  return visual;
}

function buildCakeIsle(factory: ClayFactory, root: THREE.Group, visual: IslandVisual): void {
  const cupcake = new THREE.Group();
  cupcake.position.set(-0.85, 0.75, -0.65);
  root.add(cupcake);

  const wrapper = factory.mesh(factory.cylinder(0.88, 0.66, 1.35, 16), PALETTE.wood);
  wrapper.position.y = 0.68;
  cupcake.add(wrapper);
  for (let i = 0; i < 8; i += 1) {
    const rib = factory.mesh(factory.rounded(0.07, 1.05, 0.05, 0.02), PALETTE.paper);
    const angle = (i / 8) * Math.PI * 2;
    rib.position.set(Math.sin(angle) * 0.72, 0.66, Math.cos(angle) * 0.72);
    rib.rotation.y = angle;
    cupcake.add(rib);
  }

  const frostingPositions = [
    [-0.5, 1.45, 0], [0.5, 1.45, 0], [0, 1.48, 0.45],
    [0, 1.48, -0.45], [0, 1.85, 0], [0, 2.25, 0],
  ] as const;
  frostingPositions.forEach(([x, y, z], index) => {
    const dollop = factory.mesh(factory.sphere(index === 5 ? 0.43 : 0.68, 16, 12), PALETTE.paper);
    dollop.position.set(x, y, z);
    dollop.scale.y = 0.72;
    cupcake.add(dollop);
  });
  const cherry = factory.mesh(factory.sphere(0.25, 12, 8), PALETTE.red);
  cherry.position.set(0, 2.65, 0);
  cupcake.add(cherry);

  const windmill = new THREE.Group();
  windmill.position.set(1.65, 0.78, -0.85);
  root.add(windmill);
  const pole = factory.mesh(factory.cylinder(0.13, 0.22, 2.75, 10), PALETTE.wood);
  pole.position.y = 1.35;
  windmill.add(pole);
  const rotor = new THREE.Group();
  rotor.position.set(0, 2.65, 0.25);
  windmill.add(rotor);
  for (let i = 0; i < 4; i += 1) {
    const blade = factory.mesh(factory.rounded(0.28, 1.45, 0.12, 0.08), PALETTE.paper);
    blade.position.y = 0.78;
    const arm = new THREE.Group();
    arm.rotation.z = (i / 4) * Math.PI * 2;
    arm.add(blade);
    rotor.add(arm);
  }
  const hub = factory.mesh(factory.cylinder(0.25, 0.25, 0.3, 12), PALETTE.red);
  hub.rotation.x = Math.PI / 2;
  rotor.add(hub);
  visual.windmills.push(rotor);
}

function buildCatHarbor(factory: ClayFactory, root: THREE.Group): void {
  const coveShape = new THREE.Shape();
  coveShape.moveTo(-1.05, -0.45);
  coveShape.bezierCurveTo(-0.35, -1, 0.85, -1.05, 1.35, -0.4);
  coveShape.lineTo(1.15, 0.35);
  coveShape.bezierCurveTo(0.45, 0.05, -0.2, 0.15, -0.85, 0.65);
  coveShape.bezierCurveTo(-1.2, 0.35, -1.25, -0.05, -1.05, -0.45);
  const cove = factory.mesh(new THREE.ShapeGeometry(coveShape), PALETTE.blue);
  cove.rotation.x = -Math.PI / 2;
  cove.position.set(1.2, 0.79, 0.75);
  cove.castShadow = false;
  root.add(cove);

  const lighthouse = new THREE.Group();
  lighthouse.position.set(-1.2, 0.75, -0.85);
  lighthouse.scale.setScalar(1.12);
  root.add(lighthouse);
  for (let i = 0; i < 4; i += 1) {
    const stripe = factory.mesh(factory.cylinder(0.52 - i * 0.035, 0.59 - i * 0.035, 0.62, 16), i % 2 === 0 ? PALETTE.paper : PALETTE.red);
    stripe.position.y = 0.32 + i * 0.62;
    lighthouse.add(stripe);
  }
  const door = factory.mesh(factory.rounded(0.25, 0.45, 0.055, 0.06), PALETTE.ink);
  door.position.set(0, 0.27, 0.575);
  lighthouse.add(door);
  const window = factory.mesh(factory.rounded(0.18, 0.24, 0.055, 0.04), PALETTE.blue);
  window.position.set(0, 1.55, 0.53);
  lighthouse.add(window);

  const lantern = factory.mesh(factory.cylinder(0.48, 0.48, 0.58, 12), PALETTE.yellow, { emissive: PALETTE.yellow, emissiveIntensity: 0.15 });
  lantern.position.y = 2.78;
  lighthouse.add(lantern);
  [-0.32, 0.32].forEach((x) => {
    const lanternPost = factory.mesh(factory.cylinder(0.035, 0.035, 0.65, 8), PALETTE.ink);
    lanternPost.position.set(x, 2.78, 0.32);
    lighthouse.add(lanternPost);
  });
  const roof = factory.mesh(factory.cone(0.7, 0.65, 12), PALETTE.red);
  roof.position.y = 3.38;
  lighthouse.add(roof);
  const railing = factory.mesh(factory.torus(0.58, 0.055), PALETTE.ink);
  railing.rotation.x = Math.PI / 2;
  railing.position.y = 2.48;
  lighthouse.add(railing);

  const flagPole = factory.mesh(factory.cylinder(0.035, 0.035, 0.75, 8), PALETTE.ink);
  flagPole.position.set(0, 3.92, 0);
  lighthouse.add(flagPole);
  const flag = factory.mesh(factory.rounded(0.48, 0.28, 0.055, 0.04), PALETTE.yellow);
  flag.position.set(0.23, 4.15, 0);
  lighthouse.add(flag);

  const dock = new THREE.Group();
  dock.position.set(1.2, 0.83, 1.75);
  root.add(dock);
  [-0.62, 0.62].forEach((x) => {
    const beam = factory.mesh(factory.rounded(0.14, 0.16, 2.85, 0.04), PALETTE.wood);
    beam.position.set(x, -0.18, 1.1);
    dock.add(beam);
  });
  for (let i = 0; i < 6; i += 1) {
    const plank = factory.mesh(factory.rounded(1.85, 0.18, 0.46, 0.06), PALETTE.wood);
    plank.position.z = i * 0.44;
    dock.add(plank);
  }
  [-0.78, 0.78].forEach((x) => {
    [0, 2.2].forEach((z) => {
      const post = factory.mesh(factory.cylinder(0.1, 0.12, 1.35, 8), PALETTE.wood);
      post.position.set(x, -0.35, z);
      dock.add(post);
      const cap = factory.mesh(factory.sphere(0.13, 8, 6), PALETTE.yellow);
      cap.position.set(x, 0.34, z);
      dock.add(cap);
    });
  });

  [[0.55, 0.93, 0.15], [2.15, 0.93, 1.05]].forEach(([x, y, z]) => {
    const buoy = factory.mesh(factory.sphere(0.13, 8, 6), PALETTE.yellow);
    buoy.position.set(x, y, z);
    root.add(buoy);
  });
}

function buildVolcanoSpa(factory: ClayFactory, root: THREE.Group, visual: IslandVisual): void {
  const volcano = factory.mesh(factory.cylinder(0.78, 1.8, 2.35, 14), PALETTE.basalt);
  volcano.position.set(-0.9, 1.85, -0.8);
  root.add(volcano);
  const crater = factory.mesh(factory.torus(0.77, 0.18), PALETTE.ink);
  crater.rotation.x = Math.PI / 2;
  crater.position.set(-0.9, 3.04, -0.8);
  root.add(crater);
  const lavaCore = factory.mesh(factory.cylinder(0.62, 0.62, 0.08, 12), PALETTE.lava, {
    emissive: PALETTE.lava,
    emissiveIntensity: 0.35,
  });
  lavaCore.position.set(-0.9, 3.01, -0.8);
  lavaCore.castShadow = false;
  root.add(lavaCore);

  const pool = factory.mesh(factory.cylinder(1.18, 1.18, 0.18, 20), PALETTE.aqua);
  pool.position.set(1.35, 0.86, 0.95);
  root.add(pool);
  const poolRim = factory.mesh(factory.torus(1.2, 0.16), PALETTE.paper);
  poolRim.rotation.x = Math.PI / 2;
  poolRim.position.set(1.35, 0.88, 0.95);
  root.add(poolRim);

  for (let i = 0; i < 4; i += 1) {
    const ring = factory.mesh(factory.torus(0.34, 0.075), PALETTE.paper, { transparent: true, opacity: 0.72 });
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.9, 3.4 + i * 0.62, -0.8);
    ring.castShadow = false;
    root.add(ring);
    visual.smokeRings.push(ring);
  }
}

function buildBerryFarm(factory: ClayFactory, root: THREE.Group): void {
  const barn = new THREE.Group();
  barn.position.set(-1.05, 0.76, -0.85);
  root.add(barn);
  const barnBody = factory.mesh(factory.rounded(1.75, 1.4, 1.45, 0.1), PALETTE.paper);
  barnBody.position.y = 0.7;
  barn.add(barnBody);
  const roof = factory.mesh(factory.cone(1.42, 1.05, 4), PALETTE.cobalt);
  roof.position.y = 1.72;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.82;
  barn.add(roof);
  const door = factory.mesh(factory.rounded(0.58, 0.82, 0.07, 0.04), PALETTE.wood);
  door.position.set(0, 0.42, 0.75);
  barn.add(door);
  const doorBrace = factory.mesh(factory.rounded(0.06, 0.72, 0.04, 0.015), PALETTE.paper);
  doorBrace.position.set(0, 0.42, 0.8);
  doorBrace.rotation.z = 0.58;
  barn.add(doorBrace);
  const barnWindow = factory.mesh(factory.rounded(0.35, 0.35, 0.06, 0.04), PALETTE.blue);
  barnWindow.position.set(0, 1.13, 0.75);
  barn.add(barnWindow);

  const berryPositions = [
    [0.55, 1.35], [1.25, 1.35], [1.95, 1.35],
    [0.75, 0.55], [1.45, 0.55], [2.15, 0.55],
  ] as const;
  berryPositions.forEach(([x, z], index) => {
    const leaves = factory.mesh(factory.sphere(0.3, 10, 7), PALETTE.mint);
    leaves.position.set(x, 0.93, z);
    leaves.scale.set(1, 0.42, 1);
    root.add(leaves);
    const berry = factory.mesh(factory.sphere(0.18, 10, 8), PALETTE.red);
    berry.position.set(x + (index % 2 === 0 ? -0.08 : 0.08), 1.12, z + 0.08);
    berry.scale.y = 1.18;
    root.add(berry);
  });

  const scarecrow = new THREE.Group();
  scarecrow.position.set(1.55, 0.78, -1.35);
  root.add(scarecrow);
  const pole = factory.mesh(factory.cylinder(0.055, 0.07, 1.9, 8), PALETTE.wood);
  pole.position.y = 0.85;
  scarecrow.add(pole);
  const arms = factory.mesh(factory.capsule(0.055, 1.05), PALETTE.wood);
  arms.position.y = 1.15;
  arms.rotation.z = Math.PI / 2;
  scarecrow.add(arms);
  const shirt = factory.mesh(factory.rounded(0.85, 0.55, 0.24, 0.09), PALETTE.blue);
  shirt.position.y = 1.05;
  scarecrow.add(shirt);
  const head = factory.mesh(factory.sphere(0.3, 12, 9), PALETTE.paper);
  head.position.y = 1.62;
  scarecrow.add(head);
  const hat = factory.mesh(factory.cone(0.43, 0.5, 12), PALETTE.yellow);
  hat.position.y = 2.02;
  scarecrow.add(hat);
}

function buildStarObservatory(factory: ClayFactory, root: THREE.Group, visual: IslandVisual): void {
  const observatory = new THREE.Group();
  observatory.position.set(-0.85, 0.76, -0.7);
  root.add(observatory);
  const base = factory.mesh(factory.cylinder(0.98, 1.1, 1.3, 18), PALETTE.paper);
  base.position.y = 0.65;
  observatory.add(base);
  const dome = factory.mesh(factory.sphere(1.04, 20, 14), PALETTE.lavender);
  dome.position.y = 1.35;
  dome.scale.y = 0.68;
  observatory.add(dome);
  const domeSlit = factory.mesh(factory.rounded(0.2, 0.85, 0.07, 0.035), PALETTE.ink);
  domeSlit.position.set(0, 1.53, 0.89);
  domeSlit.rotation.x = -0.25;
  observatory.add(domeSlit);
  const door = factory.mesh(factory.rounded(0.4, 0.65, 0.06, 0.08), PALETTE.wood);
  door.position.set(0, 0.35, 1.04);
  observatory.add(door);

  const telescope = new THREE.Group();
  telescope.position.set(1.25, 1.35, -0.6);
  telescope.rotation.z = -0.58;
  root.add(telescope);
  const tube = factory.mesh(factory.cylinder(0.2, 0.27, 1.75, 14), PALETTE.yellow);
  tube.position.y = 0.65;
  telescope.add(tube);
  const lensRim = factory.mesh(factory.cylinder(0.29, 0.29, 0.18, 14), PALETTE.ink);
  lensRim.position.y = 1.56;
  telescope.add(lensRim);
  const lens = factory.mesh(factory.cylinder(0.22, 0.22, 0.03, 14), PALETTE.blue);
  lens.position.y = 1.67;
  telescope.add(lens);
  [-0.42, 0.42].forEach((x) => {
    const leg = factory.mesh(factory.capsule(0.055, 1.15), PALETTE.wood);
    leg.position.set(x, 0.15, 0);
    leg.rotation.z = x < 0 ? -0.35 : 0.35;
    telescope.add(leg);
  });

  const sparklePositions = [[-2.2, 3.2, -0.5], [1.9, 3.55, -1.25], [0.45, 4.25, -0.9]] as const;
  sparklePositions.forEach(([x, y, z], index) => {
    const sparkle = new THREE.Group();
    sparkle.position.set(x, y, z);
    sparkle.userData.baseY = y;
    sparkle.userData.phase = index * 1.7;
    const shape = new THREE.Shape();
    const points = 8;
    for (let point = 0; point < points; point += 1) {
      const angle = (point / points) * Math.PI * 2 + Math.PI / 2;
      const radius = point % 2 === 0 ? 0.34 : 0.12;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (point === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();
    const star = factory.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 1 }), PALETTE.yellow, { emissive: PALETTE.yellow, emissiveIntensity: 0.25 });
    star.castShadow = false;
    sparkle.add(star);
    root.add(sparkle);
    visual.sparkles.push(sparkle);
  });
}

function buildMailbox(factory: ClayFactory, root: THREE.Group, target: THREE.Object3D): void {
  const mailbox = new THREE.Group();
  mailbox.position.set(0, 0.77, 1.05);
  root.add(mailbox);

  const post = factory.mesh(factory.cylinder(0.11, 0.15, 1.05, 10), PALETTE.wood);
  post.position.y = 0.5;
  mailbox.add(post);
  const box = factory.mesh(factory.rounded(0.92, 0.72, 1.05, 0.2), PALETTE.yellow);
  box.position.y = 1.25;
  mailbox.add(box);
  const slot = factory.mesh(factory.rounded(0.58, 0.09, 0.05, 0.025), PALETTE.ink);
  slot.position.set(0, 1.31, 0.54);
  mailbox.add(slot);
  const flag = factory.mesh(factory.rounded(0.08, 0.65, 0.08, 0.025), PALETTE.red);
  flag.position.set(0.53, 1.48, 0);
  mailbox.add(flag);
  const flagFace = factory.mesh(factory.rounded(0.38, 0.25, 0.08, 0.04), PALETTE.red);
  flagFace.position.set(0.36, 1.76, 0);
  mailbox.add(flagFace);

  target.position.set(0, 2.3, 1.05);
}

function buildBalloon(factory: ClayFactory, root: THREE.Group, visual: IslandVisual, color: string, x: number): void {
  const balloon = new THREE.Group();
  balloon.position.set(x, 3.8, -1.8);
  root.add(balloon);

  const envelope = factory.mesh(factory.sphere(0.95, 16, 12), color);
  envelope.scale.set(1, 1.2, 1);
  balloon.add(envelope);
  const band = factory.mesh(factory.torus(0.89, 0.075), PALETTE.paper);
  band.rotation.x = Math.PI / 2;
  balloon.add(band);
  const cap = factory.mesh(factory.cone(0.34, 0.55, 12), PALETTE.paper);
  cap.position.y = 1.25;
  balloon.add(cap);

  [-0.32, 0.32].forEach((ropeX) => {
    const rope = factory.mesh(factory.capsule(0.025, 1.15), PALETTE.ink);
    rope.position.set(ropeX, -1.25, 0);
    balloon.add(rope);
  });
  const basket = factory.mesh(factory.rounded(0.68, 0.5, 0.58, 0.1), PALETTE.wood);
  basket.position.y = -2;
  balloon.add(basket);
  visual.balloons.push(balloon);
}

function addGroundDetails(factory: ClayFactory, root: THREE.Group, islandId: number): void {
  const color = islandId === 0 ? PALETTE.paper : islandId === 1 ? PALETTE.mint : PALETTE.yellow;
  const details = [
    [-2.25, 0.95, 1.15, 0.28],
    [2.35, 0.92, -1.4, 0.22],
    [-2.15, 0.9, -1.8, 0.18],
  ] as const;
  details.forEach(([x, y, z, scale]) => {
    const stone = factory.mesh(factory.sphere(1, 10, 8), color);
    stone.position.set(x, y, z);
    stone.scale.set(scale * 1.3, scale, scale);
    root.add(stone);
  });
}
