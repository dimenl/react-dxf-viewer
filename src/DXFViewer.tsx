import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import DxfParser from 'dxf-parser';

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      container.clientWidth / -2,
      container.clientWidth / 2,
      container.clientHeight / 2,
      container.clientHeight / -2,
      1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const cleanup = () => {
      renderer.dispose();
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
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

    if (typeof file === 'string') {
      fetch(file)
        .then(res => res.text())
        .then(loadData)
        .catch(err => {
          console.error('Failed to load DXF:', err);
          onError?.(err);
        });
    } else {
      const reader = new FileReader();
      reader.onload = () => loadData(reader.result as string);
      reader.onerror = () => {
        const error = reader.error ?? new Error('Failed to read file');
        console.error(error);
        onError?.(error);
      };
      reader.readAsText(file);
    }

    return cleanup;
  }, [file, onLoad, onError]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />;
};

export default DXFViewer;
