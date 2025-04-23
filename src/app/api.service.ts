import { environment } from './../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Signup method
  signup(name: string, email: string, password: string): Observable<any> {
    console.log('Sending signup request to:', `${this.apiUrl}/auth/signup`);
    return this.http.post(`${this.apiUrl}/auth/signup`, { name, email, password })
      .pipe(
        tap(response => console.log('Signup response:', response)),
        catchError(this.handleError)
      );
  }

  // Login method
  login(email: string, password: string): Observable<any> {
    const body = { email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log('Sending login request to:', `${this.apiUrl}/auth/login`);
    console.log('With body:', body);
    
    return this.http.post<any>(`${this.apiUrl}/auth/login`, body, { headers })
      .pipe(
        tap(response => {
          console.log('Login response:', response);
          if (response && response.token) {
            console.log('Storing token in localStorage');
            localStorage.setItem('auth_token', response.token);
          } else {
            console.error('No token in login response');
          }
        }),
        catchError(this.handleError)
      );
  }

  // Get Profile method
  getProfile(): Observable<any> {
    const token = localStorage.getItem('auth_token');
    console.log('Getting profile with token:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }
    
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/auth/profile`, { headers })
      .pipe(
        tap(response => console.log('Profile response:', response)),
        catchError(this.handleError)
      );
  }

  // Update Profile method
  updateProfile(name: string, email: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    console.log('Updating profile with token:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }
    
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.apiUrl}/auth/profile`, { name, email }, { headers })
      .pipe(
        tap(response => console.log('Update profile response:', response)),
        catchError(this.handleError)
      );
  }

  // Logout method
  logout(): void {
    console.log('Logging out, removing token from localStorage');
    localStorage.removeItem('auth_token');
  }

  // 🔍 GET scan results method (NEW)
  getScanResults(): Observable<any> {
    return this.http.get(`${this.apiUrl}/scan-results`)
      .pipe(
        tap(response => console.log('Scan results response:', response)),
        catchError(this.handleError)
      );
  }

  // Scanner methods
  scanWithSonarQube(repoUrl: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/scanners/sonarqube`, { repoUrl }, { headers })
      .pipe(catchError(this.handleError));
  }

  scanWithTrivy(repoUrl: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/scanners/trivy`, { repoUrl }, { headers })
      .pipe(catchError(this.handleError));
  }

  scanWithSnyk(repoUrl: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/scanners/snyk`, { repoUrl }, { headers })
      .pipe(catchError(this.handleError));
  }

  scanWithOWASP(repoUrl: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/scanners/owasp`, { repoUrl }, { headers })
      .pipe(catchError(this.handleError));
  }
  
  // Centralized error handling
  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    
    let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
      } else if (error.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        localStorage.removeItem('auth_token');
      } else if (error.status === 403) {
        errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
      } else if (error.status === 404) {
        errorMessage = 'Ressource non trouvée.';
      } else if (error.status === 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
      } else if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else if (error.error && error.error.errors) {
        errorMessage = error.error.errors.map((err: any) => err.msg).join(', ');
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
