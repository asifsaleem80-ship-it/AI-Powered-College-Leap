import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './contexts/i18nContext';
import { ErrorProvider } from './contexts/errorContext';
import { AuthProvider } from './contexts/authContext';
import { ErrorDisplay } from './components/ErrorDisplay';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <ErrorProvider>
        <AuthProvider>
          <App />
          <ErrorDisplay />
        </AuthProvider>
      </ErrorProvider>
    </I18nProvider>
  </React.StrictMode>
);