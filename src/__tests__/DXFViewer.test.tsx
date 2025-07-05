import "@testing-library/jest-dom";
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { DXFViewer } from '../DXFViewer';
import DxfParser from 'dxf-parser';

jest.mock('three', () => {
  return {
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      traverse: jest.fn(),
    })),
    OrthographicCamera: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      updateProjectionMatrix: jest.fn(),
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      domElement: document.createElement('canvas'),
      render: jest.fn(),
      dispose: jest.fn(),
      forceContextLoss: jest.fn(),
    })),
    BufferGeometry: jest.fn().mockImplementation(() => ({
      setFromPoints: jest.fn().mockReturnThis(),
      setIndex: jest.fn(),
      computeVertexNormals: jest.fn(),
      dispose: jest.fn(),
    })),
    LineBasicMaterial: jest.fn().mockImplementation(() => ({ dispose: jest.fn() })),
    MeshBasicMaterial: jest.fn().mockImplementation(() => ({ dispose: jest.fn() })),
    Line: jest.fn(),
    Mesh: jest.fn(),
    Color: jest.fn(),
    Vector3: jest.fn().mockImplementation((x: number, y: number, z: number) => ({
      x,
      y,
      z,
      equals: jest.fn().mockReturnValue(false),
    })),
    DoubleSide: 'DoubleSide',
  };
});

jest.mock('three/examples/jsm/controls/OrbitControls.js', () => {
  return {
    OrbitControls: jest.fn().mockImplementation(() => ({
      update: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe('DXFViewer', () => {
  const file = new File([
    '0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0\n20\n0\n11\n1\n21\n1\n0\nENDSEC\n0\nEOF',
  ], 'test.dxf', { type: 'text/plain' });

  test('parses DXF on mount', async () => {
    const spy = jest.spyOn(DxfParser.prototype, 'parseSync');
    render(<DXFViewer file={file} />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  test('cleans up on unmount', async () => {
    const spy = jest.spyOn(DxfParser.prototype, 'parseSync');
    const { unmount, container } = render(<DXFViewer file={file} />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    unmount();
    expect(container.querySelector('canvas')).toBeNull();
  });
});
