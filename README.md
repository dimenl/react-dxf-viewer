# React DXF Viewer

A simple React component for viewing DXF files.
It supports basic LINE entities and now also renders simple
`3DFACE` and `SOLID` meshes for quick previews. The viewer
includes orbit controls for zooming, panning and rotating the
scene.

## Usage

```tsx
import { DXFViewer } from 'react-dxf-viewer';

export const MyViewer = () => (
  <div style={{ width: 600, height: 400 }}>
    <DXFViewer
      file="example.dxf"
      cameraPosition={{ x: 0, y: 0, z: 10 }}
      backgroundColor={0xeeeeee}
      orbitControls={{ enablePan: false }}
    />
  </div>
);
```

### Props

- `cameraPosition` – starting position of the camera.
- `backgroundColor` – background of the three.js scene.
- `orbitControls` – object of options applied to the `OrbitControls` instance.

## Installation

```bash
npm install react-dxf-viewer
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
