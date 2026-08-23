import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import { App } from './App';

const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      {/* Неделя с понедельника и русские подписи в календаре. */}
      <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1 }}>
        <Notifications position="top-right" />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
