import { Routes } from '@angular/router';

import { adminGuard } from '@core/guards/admin.guard';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · TaskFlow',
    canActivate: [guestGuard],
    loadComponent: () => import('@features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'Create account · TaskFlow',
    canActivate: [guestGuard],
    loadComponent: () => import('@features/auth/register-page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · TaskFlow',
        loadComponent: () =>
          import('@features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'tasks',
        title: 'Tasks · TaskFlow',
        loadComponent: () => import('@features/tasks/task-list-page').then((m) => m.TaskListPage),
      },
      {
        path: 'tasks/:id',
        title: 'Task · TaskFlow',
        loadComponent: () =>
          import('@features/tasks/task-detail-page').then((m) => m.TaskDetailPage),
      },
      {
        path: 'projects',
        title: 'Projects · TaskFlow',
        loadComponent: () =>
          import('@features/projects/projects-page').then((m) => m.ProjectsPage),
      },
      {
        path: 'profile',
        title: 'Profile · TaskFlow',
        loadComponent: () => import('@features/profile/profile-page').then((m) => m.ProfilePage),
      },
      {
        path: 'users',
        title: 'Users · TaskFlow',
        canActivate: [adminGuard],
        loadComponent: () => import('@features/users/users-page').then((m) => m.UsersPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
