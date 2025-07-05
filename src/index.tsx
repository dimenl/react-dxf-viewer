import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
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

    const load = (text: string) => {
      try {
        const parser = new DxfParser();
        const parsed = parser.parseSync(text);
        if (parsed.entities) {
          const material = new THREE.LineBasicMaterial({ color: 0x0000ff });
          parsed.entities.forEach((ent: any) => {
            if (ent.type === 'LINE') {
              const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(ent.start.x, ent.start.y, 0),
                new THREE.Vector3(ent.end.x, ent.end.y, 0)
              ]);
              const line = new THREE.Line(geometry, material);
              scene.add(line);
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
      renderer.dispose();
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      sceneRef.current = undefined;
      cameraRef.current = undefined;
      rendererRef.current = undefined;
    };
  }, [url, data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default DxfViewer;
export { DXFViewer } from './DXFViewer';
