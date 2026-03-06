import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'pricing',
    pathMatch: 'full',
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./features/pricing/pricing.page')
        .then(m => m.PricingPageComponent),
  },
];
