import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initWebApp } from './telegram/webapp';
import './styles.css';

// Разворачиваем окно и красим шапку до первого кадра, чтобы не мигало.
initWebApp();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
