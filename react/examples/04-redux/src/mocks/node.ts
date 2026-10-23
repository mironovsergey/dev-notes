import { setupServer } from 'msw/node';
import { createHandlers } from './handlers';

/** Mock-API для тестов: без задержки, необработанный запрос проваливает тест. */
export const server = setupServer(...createHandlers(0));
