import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import DxfParser from 'dxf-parser';
import { useResizeObserver } from './useResizeObserver';

export interface DxfViewerProps {
  /** URL of the DXF file to load */
  url?: string;
  /** Raw DXF string. Used when `url` is not provided */
  data?: string;
}

/**
 * Basic DXF viewer using three.js. It loads a DXF file using `dxf-parser`
 * and renders simple LINE entities.
 */
export const DxfViewer: React.FC<DxfViewerProps> = ({ url, data }) => {
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
    sceneRef.current = scene;
    const camera = new THREE.OrthographicCamera(
      container.clientWidth / -2,
      container.clientWidth / 2,
      container.clientHeight / 2,
      container.clientHeight / -2,
      1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    const load = (text: string) => {
      try {
        const parser = new DxfParser();
        const parsed = parser.parseSync(text);
        if (parsed.entities) {
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
          const meshMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,
          });

          parsed.entities.forEach((ent: any) => {
            if (ent.type === 'LINE') {
              const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(ent.start.x, ent.start.y, 0),
                new THREE.Vector3(ent.end.x, ent.end.y, 0),
              ]);
              const line = new THREE.Line(geometry, lineMaterial);
              scene.add(line);
            } else if (ent.type === '3DFACE' && Array.isArray(ent.vertices)) {
              const points = ent.vertices
                .slice(0, 4)
                .map((v: any) => new THREE.Vector3(v.x, v.y, v.z ?? 0));
              if (points.length >= 3) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const indices =
                  points.length === 4 && !points[3].equals(points[2])
                    ? [0, 1, 2, 0, 2, 3]
                    : [0, 1, 2];
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                const mesh = new THREE.Mesh(geometry, meshMaterial);
                scene.add(mesh);
              }
            } else if (ent.type === 'SOLID' && Array.isArray(ent.points)) {
              const points = ent.points
                .slice(0, 4)
                .map((v: any) => new THREE.Vector3(v.x, v.y, v.z ?? 0));
              if (points.length >= 3) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const indices =
                  points.length === 4 && !points[3].equals(points[2])
                    ? [0, 1, 2, 0, 2, 3]
                    : [0, 1, 2];
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                const mesh = new THREE.Mesh(geometry, meshMaterial);
                scene.add(mesh);
              }
            }
          });
        }
        renderer.render(scene, camera);
      } catch (err) {
        console.error('Error parsing DXF:', err);
      }
    };

    if (url) {
      fetch(url)
        .then(res => res.text())
        .then(load)
        .catch(err => console.error('Failed to load DXF:', err));
    } else if (data) {
      load(data);
    }

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
      controls.dispose();
      renderer.dispose();
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      sceneRef.current = undefined;
      cameraRef.current = undefined;
      rendererRef.current = undefined;
      controlsRef.current = undefined;
    };
  }, [url, data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default DxfViewer;
export { DXFViewer } from './DXFViewer';
