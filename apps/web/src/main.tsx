import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from '@/router';
import { ensureDemoDocumentsSeeded } from '@/lib/storage';
import '@/styles/globals.css';

ensureDemoDocumentsSeeded();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
