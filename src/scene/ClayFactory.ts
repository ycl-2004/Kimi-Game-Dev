import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

interface ClayOptions {
  transparent?: boolean;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export class ClayFactory {
  private readonly geometries = new Map<string, THREE.BufferGeometry>();
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();

  constructor(private readonly roundedSegments: number) {}

  material(color: string, options: ClayOptions = {}): THREE.MeshStandardMaterial {
    const key = `${color}:${options.transparent ?? false}:${options.opacity ?? 1}:${options.emissive ?? ''}:${options.emissiveIntensity ?? 0}`;
    const cached = this.materials.get(key);
    if (cached) return cached;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.78,
      metalness: 0.04,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
    });
    this.materials.set(key, material);
    return material;
  }

  rounded(width: number, height: number, depth: number, radius = 0.12): RoundedBoxGeometry {
    const key = `rounded:${width}:${height}:${depth}:${radius}`;
    return this.cached(key, () => new RoundedBoxGeometry(width, height, depth, this.roundedSegments, radius)) as RoundedBoxGeometry;
  }

  sphere(radius = 1, widthSegments = 16, heightSegments = 12): THREE.SphereGeometry {
    const key = `sphere:${radius}:${widthSegments}:${heightSegments}`;
    return this.cached(key, () => new THREE.SphereGeometry(radius, widthSegments, heightSegments)) as THREE.SphereGeometry;
  }

  cylinder(top: number, bottom: number, height: number, segments = 16): THREE.CylinderGeometry {
    const key = `cylinder:${top}:${bottom}:${height}:${segments}`;
    return this.cached(key, () => new THREE.CylinderGeometry(top, bottom, height, segments)) as THREE.CylinderGeometry;
  }

  cone(radius: number, height: number, segments = 16): THREE.ConeGeometry {
    const key = `cone:${radius}:${height}:${segments}`;
    return this.cached(key, () => new THREE.ConeGeometry(radius, height, segments)) as THREE.ConeGeometry;
  }

  capsule(radius: number, length: number): THREE.CapsuleGeometry {
    const key = `capsule:${radius}:${length}`;
    return this.cached(key, () => new THREE.CapsuleGeometry(radius, length, 5, 10)) as THREE.CapsuleGeometry;
  }

  torus(radius: number, tube: number, arc = Math.PI * 2): THREE.TorusGeometry {
    const key = `torus:${radius}:${tube}:${arc}`;
    return this.cached(key, () => new THREE.TorusGeometry(radius, tube, 8, 24, arc)) as THREE.TorusGeometry;
  }

  plane(width: number, height: number): THREE.PlaneGeometry {
    const key = `plane:${width}:${height}`;
    return this.cached(key, () => new THREE.PlaneGeometry(width, height)) as THREE.PlaneGeometry;
  }

  mesh(geometry: THREE.BufferGeometry, color: string, options: ClayOptions = {}): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
    const mesh = new THREE.Mesh(geometry, this.material(color, options));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private cached(key: string, create: () => THREE.BufferGeometry): THREE.BufferGeometry {
    const cached = this.geometries.get(key);
    if (cached) return cached;
    const geometry = create();
    this.geometries.set(key, geometry);
    return geometry;
  }
}
