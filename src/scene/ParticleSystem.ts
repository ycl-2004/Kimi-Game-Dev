import * as THREE from 'three';
import { PALETTE } from '../config/gameConfig';
import { ClayFactory } from './ClayFactory';

type ParticleShape = 'box' | 'sphere';

interface Particle {
  mesh: THREE.Mesh;
  shape: ParticleShape;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  stretch: THREE.Vector3;
  age: number;
  lifetime: number;
  gravity: number;
  startScale: number;
  endScale: number;
  active: boolean;
}

export class ParticleSystem {
  readonly root = new THREE.Group();
  private readonly particles: Particle[] = [];

  constructor(private readonly factory: ClayFactory, private readonly maximum: number) {
    this.root.name = 'parcel-effects';
  }

  confetti(position: THREE.Vector3, amount = 24): void {
    const colors = [PALETTE.yellow, PALETTE.red, PALETTE.blue, PALETTE.mint, PALETTE.paper];
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * 4.2;
      this.spawn('box', position, colors[i % colors.length], {
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 3.5 + Math.random() * 4.5, Math.sin(angle) * speed),
        lifetime: 1.25 + Math.random() * 0.65,
        gravity: 7.5,
        startScale: 0.8 + Math.random() * 0.7,
        endScale: 0.35,
        stretch: new THREE.Vector3(1.4, 0.75, 0.35),
      });
    }
  }

  poof(position: THREE.Vector3, amount = 9): void {
    for (let i = 0; i < amount; i += 1) {
      const angle = (i / amount) * Math.PI * 2 + Math.random() * 0.35;
      this.spawn('sphere', position, PALETTE.paper, {
        velocity: new THREE.Vector3(Math.cos(angle) * (0.7 + Math.random()), 0.6 + Math.random() * 1.4, Math.sin(angle) * (0.7 + Math.random())),
        lifetime: 0.65 + Math.random() * 0.3,
        gravity: -0.4,
        startScale: 0.25,
        endScale: 1.1 + Math.random() * 0.5,
      });
    }
  }

  shards(position: THREE.Vector3, color = PALETTE.blue, amount = 18): void {
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.5;
      this.spawn('box', position, color, {
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 3.8, Math.sin(angle) * speed),
        lifetime: 1 + Math.random() * 0.5,
        gravity: 8.5,
        startScale: 0.9 + Math.random(),
        endScale: 0.25,
        stretch: new THREE.Vector3(1.3, 0.65, 0.8),
      });
    }
  }

  sparkles(position: THREE.Vector3, amount = 12): void {
    for (let i = 0; i < amount; i += 1) {
      const angle = (i / amount) * Math.PI * 2;
      this.spawn('box', position, PALETTE.yellow, {
        velocity: new THREE.Vector3(Math.cos(angle) * 2.4, 1.5 + Math.random() * 2, Math.sin(angle) * 2.4),
        lifetime: 0.65 + Math.random() * 0.35,
        gravity: 1.5,
        startScale: 0.9,
        endScale: 0.05,
        stretch: new THREE.Vector3(0.35, 1.8, 0.35),
      });
    }
  }

  trail(position: THREE.Vector3): void {
    this.spawn('sphere', position, PALETTE.yellow, {
      velocity: new THREE.Vector3(0, 0.3, 0),
      lifetime: 0.34,
      gravity: 0,
      startScale: 0.24,
      endScale: 0.025,
    });
  }

  clear(): void {
    for (const particle of this.particles) {
      particle.active = false;
      particle.mesh.visible = false;
    }
  }

  update(dt: number): void {
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.age += dt;
      const progress = particle.age / particle.lifetime;
      if (progress >= 1) {
        particle.active = false;
        particle.mesh.visible = false;
        continue;
      }
      particle.velocity.y -= particle.gravity * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.rotation.x += particle.spin.x * dt;
      particle.mesh.rotation.y += particle.spin.y * dt;
      particle.mesh.rotation.z += particle.spin.z * dt;
      const scale = THREE.MathUtils.lerp(particle.startScale, particle.endScale, progress);
      particle.mesh.scale.copy(particle.stretch).multiplyScalar(scale);
    }
  }

  private spawn(
    shape: ParticleShape,
    position: THREE.Vector3,
    color: string,
    options: {
      velocity: THREE.Vector3;
      lifetime: number;
      gravity: number;
      startScale: number;
      endScale: number;
      stretch?: THREE.Vector3;
    },
  ): void {
    let particle = this.particles.find((candidate) => !candidate.active && candidate.shape === shape);
    if (!particle && this.particles.length < this.maximum) {
      const geometry = shape === 'box' ? this.factory.rounded(0.16, 0.16, 0.08, 0.025) : this.factory.sphere(0.5, 8, 6);
      const mesh = this.factory.mesh(geometry, color);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.visible = false;
      this.root.add(mesh);
      particle = {
        mesh,
        shape,
        velocity: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        stretch: new THREE.Vector3(1, 1, 1),
        age: 0,
        lifetime: 1,
        gravity: 0,
        startScale: 1,
        endScale: 0,
        active: false,
      };
      this.particles.push(particle);
    }
    if (!particle) return;

    particle.mesh.material = this.factory.material(color);
    particle.mesh.position.copy(position);
    particle.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    particle.mesh.visible = true;
    particle.velocity.copy(options.velocity);
    particle.spin.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    particle.stretch.copy(options.stretch ?? new THREE.Vector3(1, 1, 1));
    particle.age = 0;
    particle.lifetime = options.lifetime;
    particle.gravity = options.gravity;
    particle.startScale = options.startScale;
    particle.endScale = options.endScale;
    particle.active = true;
  }
}
