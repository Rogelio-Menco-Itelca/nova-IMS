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
      if (err.status === 401) {
        // Token inválido / expirado → cerrar sesión
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
