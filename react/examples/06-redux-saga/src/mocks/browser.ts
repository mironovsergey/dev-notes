import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Mock-API для разработки: запускается из `main.tsx` до рендера приложения. */
export const worker = setupWorker(...handlers);
