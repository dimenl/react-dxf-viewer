import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
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
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
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
}

/**
 * DXF viewer that accepts a File object or URL string and renders
 * basic LINE entities using three.js.
 */
export const DXFViewer: React.FC<DXFViewerProps> = ({ file, className, onLoad, onError }) => {
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

    const cleanup = () => {
      rendererRef.current?.dispose();
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      sceneRef.current = undefined;
      cameraRef.current = undefined;
      rendererRef.current = undefined;
    };

    const loadData = (text: string) => {
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

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />;
};

export default DXFViewer;
