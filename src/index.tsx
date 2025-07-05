import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import DxfParser from 'dxf-parser';
import { useResizeObserver } from './useResizeObserver';

/**
 * Helper that reads the provided file or url and resolves with the
 * DXF text contents.
 */
function readDXF(source: string | File): Promise<string> {
  if (typeof source === 'string') {
    return fetch(source).then((res) => res.text());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(source);
  });
}

export interface DXFViewerProps {
  /** DXF file to load. Can be a URL string or a File object */
  file: string | File;
  /** Optional CSS class for the container */
  className?: string;
  /** Called when the DXF is successfully loaded */
  onLoad?: () => void;
  /** Called when loading or parsing fails */
  onError?: (error: unknown) => void;
  /** Initial camera position. Defaults to `{ x: 0, y: 0, z: 5 }` */
  cameraPosition?: { x: number; y: number; z: number };
  /** Scene background color. Defaults to `0xffffff` */
  backgroundColor?: THREE.ColorRepresentation;
  /** Line color for LINE entities. Defaults to `0x0000ff` */
  lineColor?: THREE.ColorRepresentation;
  /** Options passed to the OrbitControls instance */
  orbitControls?: Partial<{
    enableZoom: boolean;
    enablePan: boolean;
    enableRotate: boolean;
    enableDamping: boolean;
    dampingFactor: number;
  }>;
}

/**
 * DXF viewer that accepts a File object or URL string and renders
 * basic LINE entities using three.js.
 */
export const DXFViewer: React.FC<DXFViewerProps> = ({
  file,
  className,
  onLoad,
  onError,
  cameraPosition,
  backgroundColor,
  lineColor,
  orbitControls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animRef = useRef<number | null>(null);

  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !renderer || !scene) return;

    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.left = container.clientWidth / -2;
    camera.right = container.clientWidth / 2;
    camera.top = container.clientHeight / 2;
    camera.bottom = container.clientHeight / -2;
    camera.updateProjectionMatrix();
    controlsRef.current?.update();
    renderer.render(scene, camera);
  }, []);

  useResizeObserver(containerRef, handleResize);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    if (backgroundColor !== undefined) {
      scene.background = new THREE.Color(backgroundColor);
    }
    sceneRef.current = scene;
    const camera = new THREE.OrthographicCamera(
      container.clientWidth / -2,
      container.clientWidth / 2,
      container.clientHeight / 2,
      container.clientHeight / -2,
      0.1,
      1000,
    );
    camera.position.set(
      cameraPosition?.x ?? 0,
      cameraPosition?.y ?? 0,
      cameraPosition?.z ?? 5,
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableRotate = false;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    if (orbitControls) {
      Object.entries(orbitControls).forEach(([key, value]) => {
        (controls as any)[key] = value;
      });
    }
    controlsRef.current = controls;

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    const cleanup = () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }

      controls.dispose();

      // Dispose geometries and materials from the scene
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (Array.isArray((mesh as any).material)) {
          (mesh as any).material.forEach((m: any) => m.dispose && m.dispose());
        } else if ((mesh as any).material) {
          (mesh as any).material.dispose && (mesh as any).material.dispose();
        }
      });

      renderer.dispose();
      renderer.forceContextLoss();

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      sceneRef.current = undefined;
      cameraRef.current = undefined;
      rendererRef.current = undefined;
      controlsRef.current = undefined;
    };

    const loadData = (text: string) => {
      try {
        const parser = new DxfParser();
        const parsed = parser.parseSync(text);
        if (parsed.entities) {
          const lineMaterial = new THREE.LineBasicMaterial({
            color: lineColor ?? 0x0000ff,
          });
          const meshMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,
          });
          const dashedLineMaterial = new THREE.LineDashedMaterial({
            color: 0xffffff, // your line color
            dashSize: 3, // length of each dash
            gapSize: 1, // length of gap between dashes
          });
          const box = new THREE.Box3();
          let hasGeometry = false;

          parsed.entities.forEach((ent: any) => {
            if (ent.type === 'LINE' && ent.vertices) {
              const start = new THREE.Vector3(
                ent.vertices[0].x,
                ent.vertices[0].y,
                ent.vertices[0].z ?? 0,
              );
              const end = new THREE.Vector3(
                ent.vertices[1].x,
                ent.vertices[1].y,
                ent.vertices[1].z ?? 0,
              );
              const geometry = new THREE.BufferGeometry().setFromPoints([
                start,
                end,
              ]);
              if (ent.lineType?.toLocaleLowerCase() === 'dashed') {
                const line = new THREE.Line(geometry, dashedLineMaterial);
                line.computeLineDistances();
                scene.add(line);
              } else {
                const line = new THREE.Line(geometry, lineMaterial);
                scene.add(line);
              }
              box.expandByPoint(start);
              box.expandByPoint(end);
              hasGeometry = true;
            } else if (ent.type === 'ARC') {
              // 1) Create the ArcCurve with radians directly
              const arcCurve = new THREE.ArcCurve(
                ent.center.x, // cx
                ent.center.y, // cy
                ent.radius, // radius
                ent.startAngle, // startAngle (radians)
                ent.endAngle, // endAngle   (radians)
                false, // clockwise? false for CCW
              );
              // 2) Sample it—32 segments gives a smooth half-circle
              const pts2D = arcCurve.getPoints(32);
              // 3) Lift into 3D using ent.center.z
              const pts3D = pts2D.map(
                (p: any) => new THREE.Vector3(p.x, p.y, ent.center.z ?? 0),
              );
              // 4) Build BufferGeometry and compute dash distances
              const geometry = new THREE.BufferGeometry().setFromPoints(pts3D);
              geometry.computeBoundingSphere(); // helps with frustum-culling
              // 5) Create the line (uses your dashedLineMaterial)
              const arcLine = new THREE.Line(geometry, lineMaterial);
              // 6) Add to scene and expand your Box3
              scene.add(arcLine);
              pts3D.forEach((p: any) => box.expandByPoint(p));
              hasGeometry = true;
            } else if (ent.type === 'CIRCLE') {
              // 1. Compute points around the full circle
              const center = new THREE.Vector3(
                ent.center.x,
                ent.center.y,
                ent.center.z ?? 0,
              );
              const radius = ent.radius;
              const segments = 64;
              const points = [];
              for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                points.push(
                  new THREE.Vector3(
                    center.x + Math.cos(theta) * radius,
                    center.y + Math.sin(theta) * radius,
                    center.z,
                  ),
                );
              }
              // 2. Use a LineLoop for closed shape
              const geom = new THREE.BufferGeometry().setFromPoints(points);
              const circle = new THREE.LineLoop(geom, lineMaterial);
              scene.add(circle);
              // 3. Update bounding box
              points.forEach((p) => box.expandByPoint(p));
              hasGeometry = true;
            } else if (ent.type === 'SPLINE') {
              // 1) Turn your raw control points into Vector3s
              const ctrlPts = ent.controlPoints.map(
                (v: any) => new THREE.Vector3(v.x, v.y, v.z ?? 0),
              );
              // 2) Build a centripetal Catmull–Rom curve:
              //    - closed = false
              //    - curveType = 'centripetal'  (avoids cusps/loops)
              //    - tension = 0.5              (standard; lower = looser, higher = tighter)
              const curve = new THREE.CatmullRomCurve3(
                ctrlPts,
                false,
                'centripetal',
                0.5,
              );
              // 3) Sample it finely—128 segments for super smooth result
              const samples = 128;
              const pts = curve.getPoints(samples);
              // 4) Build the geometry and dash distances
              const geom = new THREE.BufferGeometry().setFromPoints(pts);
              geom.computeBoundingSphere();
              // 5) Create and add the dashed line
              const splineLine = new THREE.Line(geom, lineMaterial);
              scene.add(splineLine);
              // 6) Expand your bounding box
              pts.forEach((p: any) => box.expandByPoint(p));
              hasGeometry = true;
            } else if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
              const pts = ent.vertices.map(
                (v) => new THREE.Vector3(v.x, v.y, v.z ?? 0),
              );
              // close the loop if needed
              if (ent.closed) pts.push(pts[0].clone());

              const geom = new THREE.BufferGeometry().setFromPoints(pts);
              if (ent.lineType?.toLowerCase() === 'dashed') {
                geom.computeLineDistances();
                scene.add(new THREE.Line(geom, dashedLineMaterial));
              } else {
                scene.add(new THREE.Line(geom, lineMaterial));
              }

              pts.forEach((p) => box.expandByPoint(p));
              hasGeometry = true;
            }
          });
          if (hasGeometry) {
            const center = new THREE.Vector3();
            box.getCenter(center);
            controls.target.copy(center);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y);
            const camZ = cameraPosition?.z ?? Math.max(maxDim * 2, 1);
            camera.position.set(center.x, center.y, camZ);
            camera.near = 0.1;
            camera.far = Math.max(camZ * 2, 1);
            camera.updateProjectionMatrix();
          }
        }
        renderer.render(scene, camera);
        onLoad?.();
      } catch (err) {
        console.error('Error parsing DXF:', err);
        onError?.(err);
      }
    };

    readDXF(file)
      .then(loadData)
      .catch((err) => {
        console.error('Failed to load DXF:', err);
        onError?.(err);
      });

    return cleanup;
  }, [file, onLoad, onError]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default DXFViewer;
