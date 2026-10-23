import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.scss';
import { App } from './app';

/** Mock-API должен быть готов до первого запроса, поэтому worker запускается первым. */
async function enableMocking(): Promise<void> {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Корневой контейнер #root не найден');
}

enableMocking().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
