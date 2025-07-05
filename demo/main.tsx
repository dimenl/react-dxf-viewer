import React from 'react';
import ReactDOM from 'react-dom/client';
import { DXFViewer } from '../src';

const App = () => (
  <div style={{ width: '100%', height: '100%' }}>
    <DXFViewer file="./example.dxf" />
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
