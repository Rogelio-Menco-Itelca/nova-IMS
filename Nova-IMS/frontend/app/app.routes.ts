import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'change-password',
    loadComponent: () =>
      import('../src/components/change-password/change-password.component')
        .then(m => m.ChangePasswordComponent),
  },
];