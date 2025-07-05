import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import DxfParser from 'dxf-parser';

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
    };
  }, [url, data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default DxfViewer;
