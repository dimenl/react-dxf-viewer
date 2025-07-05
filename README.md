# React DXF Viewer

A simple React component for viewing DXF files.
It supports basic LINE entities and now also renders simple
`3DFACE` and `SOLID` meshes for quick previews. The viewer
includes orbit controls for zooming, panning and rotating the
scene.

## Usage

Install the package and import `DXFViewer` in your React component.

```bash
npm install react-dxf-viewer
```

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

### Loading a local file

You can also pass a `File` object returned from an `<input type="file" />`.

```tsx
const LocalFileExample = () => {
  const [file, setFile] = React.useState<File | null>(null);

  return (
    <div style={{ width: 600, height: 400 }}>
      <input
        type="file"
        accept=".dxf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {file && <DXFViewer file={file} />}
    </div>
  );
};
```

### Props

- `file` – DXF file to load. Can be a URL string or a `File` object.
- `className` – optional CSS class applied to the container element.
- `onLoad` – called when the file has been successfully loaded.
- `onError` – called with an error if loading or parsing fails.
- `cameraPosition` – starting position of the camera. Defaults to `{ x: 0, y: 0, z: 5 }`.
- `backgroundColor` – background color of the three.js scene. Defaults to `0xffffff`.
- `orbitControls` – object of options passed directly to the `OrbitControls` instance.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
