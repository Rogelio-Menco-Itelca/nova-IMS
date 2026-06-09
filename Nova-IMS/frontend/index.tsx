import './src/animations.css';
import './src/theme-light.css';

import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppComponent } from './src/app.component';
import { authInterceptor } from './src/interceptors/auth.interceptor';
import { loadGoogleMaps } from './src/utils/google-maps-loader';

loadGoogleMaps()
  .catch((err) => console.warn('[Maps]', err))
  .finally(() => {
    bootstrapApplication(AppComponent, {
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
      ],
    }).catch((err) => console.error(err));
  });
