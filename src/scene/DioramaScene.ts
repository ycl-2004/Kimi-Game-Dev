import * as THREE from 'three';
import { GAMEPLAY, ISLANDS, PALETTE } from '../config/gameConfig';
import type { GameMode, GameSnapshot, IslandDefinition, ParcelState, ResultEvent, ResultKind } from '../game/types';
import { BELT_END_X, BELT_START_X, LAUNCH_POSITION, buildCloudSea, buildConveyor, buildPostalCat, updateConveyor } from './actors';
import type { CatVisual, ConveyorVisual } from './actors';
import { ClayFactory } from './ClayFactory';
import { buildIsland } from './islands';
import type { IslandVisual } from './islands';
import { ParticleSystem } from './ParticleSystem';
import { buildParcel, updateParcelCountdown } from './parcels';
import type { ParcelVisual } from './parcels';

interface IslandRig {
  visual: IslandVisual;
  label: HTMLDivElement;
  distance: number;
  bounceAge: number;
}

interface ParcelRig {
  visual: ParcelVisual;
}

type FlightEnd = 'PERFECT' | 'GOOD' | 'WRONG' | 'SHATTER' | 'POOF';

interface FlightAnimation {
  visual: ParcelVisual;
  kind: ResultKind;
  endBehavior: FlightEnd;
  islandId: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  elapsed: number;
  duration: number;
  arcHeight: number;
  trailTimer: number;
}

interface BounceAnimation {
  visual: ParcelVisual;
  origin: THREE.Vector3;
  elapsed: number;
  wrong: boolean;
}

export class DioramaScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly resizeObserver: ResizeObserver;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
  private readonly factory: ClayFactory;
  private readonly mobile: boolean;
  private readonly softwareRenderer: boolean;
  private readonly shadowsEnabled: boolean;
  private readonly conveyor: ConveyorVisual;
  private readonly cat: CatVisual;
  private readonly clouds: THREE.Group;
  private readonly particles: ParticleSystem;
  private readonly feverLight: THREE.PointLight;
  private readonly islands = new Map<number, IslandRig>();
  private readonly parcels = new Map<number, ParcelRig>();
  private readonly flights: FlightAnimation[] = [];
  private readonly bounces: BounceAnimation[] = [];
  private readonly aimDots: THREE.Mesh[] = [];
  private readonly resizeHandler = (): void => this.resize();
  private readonly projected = new THREE.Vector3();
  private readonly temp = new THREE.Vector3();
  private timeline = 0;
  private beltOffset = 0;
  private beltPulse = 0;
  private catActionAge = 10;
  private catCelebration = false;
  private catMiss = false;
  private feverSparkTimer = 0;
  private shadowRefresh = 0;
  private labelWidth = 1;
  private labelHeight = 1;
  private lastMode: GameMode | null = null;

  constructor(private readonly container: HTMLElement, private readonly labelLayer: HTMLElement) {
    this.mobile = window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.softwareRenderer = this.detectSoftwareRenderer();
    this.shadowsEnabled = !this.softwareRenderer && !this.mobile;
    this.factory = new ClayFactory(this.softwareRenderer ? 1 : 2);
    const pixelRatioCap = this.softwareRenderer ? 0.85 : this.mobile ? 1.15 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = this.softwareRenderer ? THREE.LinearToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.softwareRenderer ? 0.9 : 1.08;
    this.renderer.shadowMap.enabled = this.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = this.shadowsEnabled;
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.pointerEvents = 'none';
    this.renderer.domElement.style.zIndex = '0';
    container.appendChild(this.renderer.domElement);
    labelLayer.style.pointerEvents = 'none';
    labelLayer.style.zIndex = '1';

    this.scene.background = this.createSkyTexture();
    this.scene.fog = new THREE.Fog(PALETTE.sky, 48, 115);

    const hemisphere = new THREE.HemisphereLight(0xfff9f0, 0xd8c3a5, 1);
    this.scene.add(hemisphere);
    const sunlight = new THREE.DirectionalLight(0xfff2dc, 1.4);
    sunlight.position.set(-14, 24, 16);
    sunlight.castShadow = this.shadowsEnabled;
    const shadowSize = 512;
    sunlight.shadow.mapSize.set(shadowSize, shadowSize);
    sunlight.shadow.camera.left = -32;
    sunlight.shadow.camera.right = 32;
    sunlight.shadow.camera.top = 32;
    sunlight.shadow.camera.bottom = -32;
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 75;
    sunlight.shadow.bias = -0.0004;
    sunlight.shadow.normalBias = 0.035;
    this.scene.add(sunlight);

    this.feverLight = new THREE.PointLight(PALETTE.yellow, 0, 32, 2);
    this.feverLight.position.set(2, 8, 4);
    if (!this.softwareRenderer) this.scene.add(this.feverLight);

    const sun = this.factory.mesh(this.factory.sphere(3.8, 20, 16), PALETTE.yellow);
    sun.position.set(-24, 17, -46);
    sun.castShadow = false;
    sun.receiveShadow = false;
    this.scene.add(sun);

    this.clouds = buildCloudSea(this.factory, this.softwareRenderer ? 48 : this.mobile ? 64 : 100);
    this.scene.add(this.clouds);

    for (const definition of ISLANDS) {
      const visual = buildIsland(this.factory, definition);
      const label = this.createIslandLabel(definition.name, definition.id, definition.color);
      this.scene.add(visual.root);
      this.islands.set(definition.id, { visual, label, distance: definition.baseDistance, bounceAge: 10 });
    }

    this.conveyor = buildConveyor(this.factory, this.softwareRenderer ? 20 : this.mobile ? 24 : 32);
    this.scene.add(this.conveyor.root);
    updateConveyor(this.conveyor, 0);

    this.cat = buildPostalCat(this.factory);
    this.scene.add(this.cat.root);

    for (let i = 0; i < 7; i += 1) {
      const dot = this.factory.mesh(this.factory.sphere(0.095, 8, 6), PALETTE.yellow, { emissive: PALETTE.yellow, emissiveIntensity: 0.25 });
      dot.visible = false;
      dot.castShadow = false;
      dot.receiveShadow = false;
      this.scene.add(dot);
      this.aimDots.push(dot);
    }

    this.particles = new ParticleSystem(this.factory, this.softwareRenderer ? 48 : this.mobile ? 72 : 140);
    this.scene.add(this.particles.root);

    this.updateIslandPositions(0);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    this.resize();
  }

  setTimeline(time: number): void {
    if (!Number.isFinite(time)) return;
    this.timeline = Math.max(0, time);
    this.updateIslandPositions(0);
  }

  getIslandDistance(id: number): number {
    return this.islands.get(id)?.distance ?? 0;
  }

  update(dt: number, snapshot: GameSnapshot): void {
    const delta = THREE.MathUtils.clamp(Number.isFinite(dt) ? dt : 0, 0, 0.5);
    if (this.lastMode !== snapshot.mode) {
      if (this.lastMode !== null && snapshot.mode !== 'ended') this.resetTransient();
      this.lastMode = snapshot.mode;
    }

    this.updateIslandPositions(delta);
    this.clouds.position.x = Math.sin(this.timeline * 0.035) * 2.2;
    this.clouds.position.z = Math.cos(this.timeline * 0.025) * 0.8;

    this.beltPulse = Math.max(0, this.beltPulse - delta * 1.8);
    this.beltOffset += delta * snapshot.beltFlowSpeed * (1 + this.beltPulse * 0.65);
    this.beltOffset %= BELT_END_X - BELT_START_X;
    updateConveyor(this.conveyor, this.beltOffset);

    this.syncParcels(snapshot);
    this.updateFlights(delta);
    this.updateBounces(delta);
    this.updateCat(delta, snapshot);
    this.updateAim(snapshot);
    this.particles.update(delta);

    const feverTarget = snapshot.feverActive ? 2.5 + Math.sin(this.timeline * 6) * 0.35 : 0;
    this.feverLight.intensity = THREE.MathUtils.lerp(this.feverLight.intensity, feverTarget, 1 - Math.exp(-delta * 7));
    if (snapshot.feverActive) {
      this.feverSparkTimer -= delta;
      if (this.feverSparkTimer <= 0) {
        this.temp.copy(LAUNCH_POSITION).add(new THREE.Vector3((Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 2));
        this.particles.sparkles(this.temp, 2);
        this.feverSparkTimer = 0.16;
      }
    }

    if (this.shadowsEnabled) {
      this.shadowRefresh -= delta;
      if (this.shadowRefresh <= 0) {
        this.renderer.shadowMap.needsUpdate = true;
        this.shadowRefresh = 1 / 12;
      }
    }
    this.updateLabels(snapshot.frontParcel?.targetIslandId ?? null);
    this.renderer.render(this.scene, this.camera);
  }

  handleResult(event: ResultEvent): void {
    let rig = this.parcels.get(event.parcel.id);
    if (!rig) {
      const visual = buildParcel(this.factory, event.parcel);
      visual.group.position.copy(LAUNCH_POSITION);
      this.scene.add(visual.group);
      rig = { visual };
    }
    this.parcels.delete(event.parcel.id);
    const visual = rig.visual;
    const selected = this.islands.has(event.selectedIslandId) ? event.selectedIslandId : event.parcel.targetIslandId;
    const start = visual.group.position.clone();
    let end = start.clone();
    let arcHeight = 0.6;
    let duration: number = GAMEPLAY.flightDuration;
    let endBehavior: FlightEnd = 'POOF';

    if (event.kind === 'PERFECT' || event.kind === 'GOOD' || event.kind === 'WRONG ISLAND') {
      end = this.predictLanding(selected, this.timeline + duration, event.kind);
      arcHeight = event.kind === 'PERFECT' ? 5.2 : 3.8;
      endBehavior = event.kind === 'PERFECT' ? 'PERFECT' : event.kind === 'GOOD' ? 'GOOD' : 'WRONG';
    } else if (event.kind === 'TOO WEAK') {
      const target = this.predictLanding(selected, this.timeline + duration, 'GOOD');
      end = start.clone().lerp(target, 0.57);
      end.y = -4.4;
      arcHeight = 3;
      duration = 1.05;
    } else if (event.kind === 'TOO STRONG') {
      const target = this.predictLanding(selected, this.timeline + duration, 'FAR');
      end = target;
      arcHeight = 5.5;
      if (event.parcel.type === 'FRAGILE') endBehavior = 'SHATTER';
      else {
        end.z -= 8;
        end.y = -4.5;
      }
    } else if (event.kind === 'DROPPED') {
      end = start.clone().add(new THREE.Vector3(0.7, -7.5, 1.2));
      duration = 0.95;
      arcHeight = 0.25;
    } else if (event.kind === 'EXPIRED') {
      end = start.clone().add(new THREE.Vector3(0, 0.6, 0));
      duration = 0.35;
      arcHeight = 0.45;
    }

    this.flights.push({
      visual,
      kind: event.kind,
      endBehavior,
      islandId: selected,
      start,
      end,
      elapsed: 0,
      duration,
      arcHeight,
      trailTimer: 0,
    });

    this.catActionAge = 0;
    this.catCelebration = event.kind === 'PERFECT';
    this.catMiss = event.kind !== 'PERFECT' && event.kind !== 'GOOD';
  }

  handleStepUp(step: number): void {
    this.beltPulse = 1 + Math.max(0, step - 1) * 0.08;
    this.catActionAge = 0;
    this.catCelebration = true;
    this.catMiss = false;
    this.temp.copy(LAUNCH_POSITION).add(new THREE.Vector3(-1, 2, 0));
    this.particles.confetti(this.temp, 10 + step * 2);
  }

  resize(): void {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const aspect = width / height;
    this.labelWidth = this.labelLayer.clientWidth || width;
    this.labelHeight = this.labelLayer.clientHeight || height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.75 ? 45 : 39;
    const fit = Math.max(1, 0.92 / aspect);
    const target = new THREE.Vector3(0, 0, -5);
    const offset = new THREE.Vector3(16, 18, 32).multiplyScalar(fit);
    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    for (const rig of this.islands.values()) {
      rig.label.style.fontSize = width < 600 ? '10px' : '13px';
      rig.label.style.padding = width < 600 ? '5px 9px' : '7px 12px';
      rig.label.style.borderWidth = width < 600 ? '1px' : '2px';
    }
  }

  private updateIslandPositions(dt: number): void {
    for (const rig of this.islands.values()) {
      const { definition, root, windmills, balloons, smokeRings } = rig.visual;
      rig.distance = this.distanceAt(definition, this.timeline);
      const bob = Math.sin(this.timeline * 1.25 + definition.driftPhase) * 0.22;
      rig.bounceAge += dt;
      const bounce = Math.exp(-rig.bounceAge * 4.5) * Math.sin(rig.bounceAge * 15);
      root.position.set(definition.x, bob + Math.abs(bounce) * 0.38, THREE.MathUtils.lerp(GAMEPLAY.nearWorldDepth, GAMEPLAY.farWorldDepth, rig.distance));
      root.rotation.y = Math.sin(this.timeline * 0.45 + definition.driftPhase) * 0.025;
      root.scale.set(1 + bounce * 0.07, 1 - bounce * 0.1, 1 + bounce * 0.07);

      for (const windmill of windmills) windmill.rotation.z -= dt * 1.35;
      balloons.forEach((balloon, index) => {
        balloon.position.y = 3.8 + Math.sin(this.timeline * 0.9 + definition.id + index) * 0.3;
        balloon.rotation.z = Math.sin(this.timeline * 0.65 + definition.id) * 0.055;
      });
      smokeRings.forEach((ring, index) => {
        const progress = (this.timeline * 0.24 + index / smokeRings.length) % 1;
        ring.position.y = 3.35 + progress * 2.8;
        ring.scale.setScalar(0.55 + progress * 1.05);
        ring.visible = progress < 0.94;
      });
    }
  }

  private syncParcels(snapshot: GameSnapshot): void {
    const visible: ParcelState[] = [];
    if (snapshot.frontParcel) visible.push(snapshot.frontParcel);
    for (const parcel of snapshot.queue) {
      if (parcel.id !== snapshot.frontParcel?.id) visible.push(parcel);
    }
    const ids = new Set(visible.map((parcel) => parcel.id));
    for (const [id, rig] of this.parcels) {
      if (!ids.has(id)) {
        this.scene.remove(rig.visual.group);
        this.parcels.delete(id);
      }
    }

    for (const parcel of visible) {
      const isFront = parcel.id === snapshot.frontParcel?.id;
      let rig = this.parcels.get(parcel.id);

      if (rig && rig.visual.type !== parcel.type) {
        const previous = rig.visual;
        const visual = buildParcel(this.factory, parcel);
        visual.group.position.copy(previous.group.position);
        visual.group.quaternion.copy(previous.group.quaternion);
        visual.group.scale.copy(previous.group.scale);
        this.scene.remove(previous.group);
        this.scene.add(visual.group);
        rig.visual = visual;
      }

      if (!rig) {
        const visual = buildParcel(this.factory, parcel);
        visual.group.position.set(parcel.beltX, LAUNCH_POSITION.y, LAUNCH_POSITION.z);
        this.scene.add(visual.group);
        rig = { visual };
        this.parcels.set(parcel.id, rig);
      }

      rig.visual.group.position.x = parcel.beltX;
      rig.visual.group.position.y = LAUNCH_POSITION.y + Math.sin(this.timeline * 2.2 + parcel.id) * 0.045;
      rig.visual.group.position.z = LAUNCH_POSITION.z;
      rig.visual.group.rotation.y = Math.sin(this.timeline * 1.4 + parcel.id) * 0.075;
      rig.visual.group.rotation.z = Math.sin(this.timeline * 1.8 + parcel.id) * 0.025;
      const charging = snapshot.charging !== null && isFront;
      const pulse = Math.sin(this.timeline * 2.6 + parcel.id) * 0.018;
      const spawnScale = THREE.MathUtils.clamp((parcel.beltX - BELT_START_X) / 0.8 + 0.2, 0.2, 1);
      rig.visual.group.scale.set(
        (1 + pulse + (charging ? 0.07 : 0)) * spawnScale,
        (1 + pulse - (charging ? 0.1 : 0)) * spawnScale,
        (1 + pulse + (charging ? 0.07 : 0)) * spawnScale,
      );
      updateParcelCountdown(rig.visual, parcel.expressRemaining);
    }
  }

  private updateFlights(dt: number): void {
    for (let i = this.flights.length - 1; i >= 0; i -= 1) {
      const flight = this.flights[i];
      flight.elapsed += dt;
      const progress = THREE.MathUtils.clamp(flight.elapsed / flight.duration, 0, 1);
      flight.visual.group.position.lerpVectors(flight.start, flight.end, progress);
      flight.visual.group.position.y += 4 * flight.arcHeight * progress * (1 - progress);
      flight.visual.group.rotation.x += dt * 3.2;
      flight.visual.group.rotation.z += dt * (flight.kind === 'WRONG ISLAND' ? 6 : 2.2);
      const stretch = Math.sin(progress * Math.PI) * 0.1;
      flight.visual.group.scale.set(1 + stretch, 1 - stretch * 0.7, 1 + stretch);

      if (flight.visual.type === 'EXPRESS') {
        flight.trailTimer -= dt;
        if (flight.trailTimer <= 0) {
          this.particles.trail(flight.visual.group.position);
          flight.trailTimer = this.mobile ? 0.065 : 0.035;
        }
      }
      if (progress < 1) continue;

      this.flights.splice(i, 1);
      const position = flight.end.clone();
      if (flight.endBehavior === 'PERFECT') {
        this.scene.remove(flight.visual.group);
        this.bounceIsland(flight.islandId);
        this.particles.confetti(position, this.mobile ? 18 : 28);
        this.particles.sparkles(position, 14);
      } else if (flight.endBehavior === 'GOOD') {
        this.bounceIsland(flight.islandId);
        this.particles.confetti(position, this.mobile ? 7 : 11);
        this.bounces.push({ visual: flight.visual, origin: position, elapsed: 0, wrong: false });
      } else if (flight.endBehavior === 'WRONG') {
        this.bounceIsland(flight.islandId);
        this.bounces.push({ visual: flight.visual, origin: position, elapsed: 0, wrong: true });
      } else {
        this.scene.remove(flight.visual.group);
        if (flight.endBehavior === 'SHATTER') {
          this.particles.shards(position, PALETTE.blue, this.mobile ? 13 : 20);
          this.bounceIsland(flight.islandId);
        }
        this.particles.poof(position, flight.endBehavior === 'SHATTER' ? 6 : 9);
      }
    }
  }

  private updateBounces(dt: number): void {
    for (let i = this.bounces.length - 1; i >= 0; i -= 1) {
      const bounce = this.bounces[i];
      bounce.elapsed += dt;
      const duration = bounce.wrong ? 0.85 : 0.58;
      const progress = THREE.MathUtils.clamp(bounce.elapsed / duration, 0, 1);
      bounce.visual.group.position.copy(bounce.origin);
      if (bounce.wrong) {
        bounce.visual.group.position.x += Math.sin(progress * Math.PI) * 0.8;
        bounce.visual.group.position.y += Math.sin(progress * Math.PI) * 0.8 - progress * progress * 6;
        bounce.visual.group.position.z += progress * 2.8;
        bounce.visual.group.rotation.z += dt * 8;
      } else {
        bounce.visual.group.position.y += Math.sin(progress * Math.PI) * 0.65;
        const squash = Math.cos(progress * Math.PI * 2) * 0.09;
        bounce.visual.group.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);
      }
      if (progress >= 1) {
        this.scene.remove(bounce.visual.group);
        if (bounce.wrong) this.particles.poof(bounce.visual.group.position, 8);
        this.bounces.splice(i, 1);
      }
    }
  }

  private updateCat(dt: number, snapshot: GameSnapshot): void {
    this.catActionAge += dt;
    const charging = snapshot.charging;
    const breathe = Math.sin(this.timeline * 2.4) * 0.025;
    const actionProgress = THREE.MathUtils.clamp(this.catActionAge / 0.58, 0, 1);
    const actionWave = this.catActionAge < 0.58 ? Math.sin(actionProgress * Math.PI) : 0;
    let rotation = -0.15;
    if (charging) {
      const island = this.islands.get(charging.islandId);
      if (island) {
        const dx = island.visual.root.position.x - this.cat.root.position.x;
        const dz = island.visual.root.position.z - this.cat.root.position.z;
        rotation = Math.atan2(dx, dz);
      }
    }
    if (this.catCelebration && this.catActionAge < 0.8) {
      const spin = THREE.MathUtils.smoothstep(this.catActionAge / 0.8, 0, 1);
      rotation += spin * Math.PI * 2;
    }
    this.cat.root.rotation.y = rotation;
    this.cat.root.position.y = 1.75 + Math.sin(this.timeline * 2.1) * 0.035 + actionWave * 0.65;
    this.cat.body.scale.set(1 + (charging ? 0.12 : 0) - breathe, 1.12 - (charging ? 0.2 : 0) + breathe + actionWave * 0.18, 0.88 + (charging ? 0.08 : 0));

    const blinkPhase = this.timeline % 3.7;
    const eyeScale = blinkPhase > 3.54 ? 0.12 : 1.3;
    this.cat.leftEye.scale.y = eyeScale;
    this.cat.rightEye.scale.y = eyeScale;
    this.cat.leftEar.rotation.z = 0.14 + (charging ? Math.sin(this.timeline * 20) * 0.09 : 0);
    this.cat.rightEar.rotation.z = -0.14 - (charging ? Math.sin(this.timeline * 20 + 1) * 0.09 : 0);
    this.cat.tail.rotation.y = Math.sin(this.timeline * 3.2) * 0.48;
    this.cat.tail.rotation.z = Math.cos(this.timeline * 2.4) * 0.16;
    this.cat.leftArm.rotation.x = charging ? -0.75 : actionWave * 0.7;
    this.cat.rightArm.rotation.x = charging ? -0.75 : actionWave * 0.7;
    this.cat.head.rotation.z = this.catMiss ? Math.sin(this.catActionAge * 24) * Math.exp(-this.catActionAge * 4) * 0.32 : 0;
  }

  private updateAim(snapshot: GameSnapshot): void {
    const charging = snapshot.charging;
    if (!charging || !this.islands.has(charging.islandId)) {
      this.aimDots.forEach((dot) => { dot.visible = false; });
      return;
    }
    const end = this.predictLanding(charging.islandId, this.timeline + GAMEPLAY.flightDuration, 'PERFECT');
    const arcHeight = 2.5 + charging.power * 3;
    const origin = snapshot.frontParcel
      ? (this.parcels.get(snapshot.frontParcel.id)?.visual.group.position ?? LAUNCH_POSITION)
      : LAUNCH_POSITION;
    this.aimDots.forEach((dot, index) => {
      const progress = ((index + 1) / (this.aimDots.length + 1)) * 0.32;
      dot.position.lerpVectors(origin, end, progress);
      dot.position.y += 4 * arcHeight * progress * (1 - progress);
      dot.scale.setScalar(0.75 + index * 0.055 + Math.sin(this.timeline * 7 + index) * 0.08);
      dot.visible = true;
    });
  }

  private updateLabels(targetIslandId: number | null): void {
    this.camera.updateMatrixWorld();
    for (const rig of this.islands.values()) {
      const { root } = rig.visual;
      rig.label.classList.toggle('is-target', rig.visual.definition.id === targetIslandId);
      this.projected.set(root.position.x, root.position.y + 6.2, root.position.z).project(this.camera);
      const visible = this.projected.z > -1 && this.projected.z < 1 && Math.abs(this.projected.x) < 1.15 && Math.abs(this.projected.y) < 1.15;
      rig.label.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) continue;
      const projectedX = (this.projected.x * 0.5 + 0.5) * this.labelWidth;
      const halfLabelWidth = rig.label.offsetWidth * 0.5;
      const x = THREE.MathUtils.clamp(projectedX, halfLabelWidth + 6, this.labelWidth - halfLabelWidth - 6);
      const y = (-this.projected.y * 0.5 + 0.5) * this.labelHeight;
      rig.label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  }

  private predictLanding(id: number, time: number, kind: 'PERFECT' | 'GOOD' | 'WRONG ISLAND' | 'FAR'): THREE.Vector3 {
    const rig = this.islands.get(id);
    if (!rig) return LAUNCH_POSITION.clone();
    const { definition } = rig.visual;
    const distance = this.distanceAt(definition, time);
    const z = THREE.MathUtils.lerp(GAMEPLAY.nearWorldDepth, GAMEPLAY.farWorldDepth, distance);
    const y = Math.sin(time * 1.25 + definition.driftPhase) * 0.22;
    if (kind === 'PERFECT') return new THREE.Vector3(definition.x, y + 2.3, z + 1.05);
    if (kind === 'FAR') return new THREE.Vector3(definition.x, y + 1.1, z - 2.65);
    return new THREE.Vector3(definition.x, y + 1.05, z + 2.55);
  }

  private distanceAt(definition: IslandDefinition, time: number): number {
    const angle = (Math.PI * 2 * time) / definition.driftPeriod + definition.driftPhase;
    return THREE.MathUtils.clamp(definition.baseDistance + definition.driftAmp * Math.sin(angle), 0, 1);
  }

  private bounceIsland(id: number): void {
    const island = this.islands.get(id);
    if (island) island.bounceAge = 0;
  }

  private resetTransient(): void {
    for (const rig of this.parcels.values()) this.scene.remove(rig.visual.group);
    for (const flight of this.flights) this.scene.remove(flight.visual.group);
    for (const bounce of this.bounces) this.scene.remove(bounce.visual.group);
    this.parcels.clear();
    this.flights.length = 0;
    this.bounces.length = 0;
    this.particles.clear();
    this.catActionAge = 10;
    this.catCelebration = false;
    this.catMiss = false;
    this.aimDots.forEach((dot) => { dot.visible = false; });
  }

  private createIslandLabel(name: string, id: number, color: string): HTMLDivElement {
    const label = document.createElement('div');
    label.className = 'island-label';
    label.textContent = `${id + 1} • ${name}`;
    label.style.position = 'absolute';
    label.style.left = '0';
    label.style.top = '0';
    label.style.whiteSpace = 'nowrap';
    label.style.border = `2px solid ${PALETTE.ink}`;
    label.style.borderRadius = '999px';
    label.style.background = PALETTE.paper;
    label.style.color = PALETTE.ink;
    label.style.boxShadow = `0 3px 0 ${PALETTE.ink}`;
    label.style.fontFamily = 'Fredoka, sans-serif';
    label.style.fontWeight = '700';
    label.style.letterSpacing = '0.02em';
    label.style.pointerEvents = 'none';
    label.style.willChange = 'transform';
    label.style.borderBottomColor = color;
    this.labelLayer.appendChild(label);
    return label;
  }

  private detectSoftwareRenderer(): boolean {
    const gl = this.renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return false;
    const rendererName = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(rendererName);
  }

  private createSkyTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, PALETTE.sky);
      gradient.addColorStop(1, PALETTE.paper);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 16, 256);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
