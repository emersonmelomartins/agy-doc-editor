import React, { useEffect } from 'react';
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  useNavigate,
} from '@tanstack/react-router';
import { ThemeProvider } from '@/components/theme-provider';
import ThemeToggle from '@/components/theme-toggle';

function RootLayout() {
  return (
    <ThemeProvider>
      <Outlet />
      <ThemeToggle />
    </ThemeProvider>
  );
}

function NotFoundRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: '/', replace: true });
  }, [navigate]);

  return null;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('@/pages/home-page')),
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor/$id',
  component: lazyRouteComponent(() => import('@/pages/editor-page')),
});

const componentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/componentes',
  component: lazyRouteComponent(() => import('@/pages/components-page')),
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundRedirect,
});

const routeTree = rootRoute.addChildren([indexRoute, editorRoute, componentsRoute, notFoundRoute]);

export const router = createRouter({
  routeTree,
  notFoundRoute,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
