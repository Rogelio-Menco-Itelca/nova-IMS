import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { apiBaseUrl } from '../utils/api-base';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const base = apiBaseUrl();

  let apiReq = req;
  if (base && req.url.startsWith('/')) {
    apiReq = req.clone({ url: `${base}${req.url}` });
  }
  if (token) {
    apiReq = apiReq.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(apiReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthChallenge = [
        '/auth/change-password',
        '/auth/change-password-credentials',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/login',
        '/auth/verify-otp',
      ].some((path) => apiReq.url.includes(path));
      if (err.status === 401 && !isAuthChallenge) {
        auth.logout('sesion_expirada');
      }
      return throwError(() => err);
    }),
  );
};
