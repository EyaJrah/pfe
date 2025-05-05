import { environment } from './../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly backendUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Signup method
  signup(name: string, email: string, password: string): Observable<any> {
    console.log('Sending signup request to:', `${this.backendUrl}/auth/signup`);
    return this.http.post(`${this.backendUrl}/auth/signup`, { name, email, password })
      .pipe(
        tap(response => console.log('Signup response:', response)),
        catchError(this.handleError)
      );
  }

  // Login method
  login(email: string, password: string): Observable<any> {
    const body = { email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log('Sending login request to:', `${this.backendUrl}/users/login`);
    console.log('With body:', body);
    
    return this.http.post<any>(`${this.backendUrl}/users/login`, body, { headers })
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
    return this.http.get(`${this.backendUrl}/users/profile`, { headers })
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
    return this.http.put(`${this.backendUrl}/users/profile`, { name, email }, { headers })
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

  // Get scan results - can be used with or without a specific repoUrl
  getScanResults(repoUrl?: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = repoUrl 
      ? `${this.backendUrl}/scan-results?repoUrl=${encodeURIComponent(repoUrl)}`
      : `${this.backendUrl}/scan-results`;

    return this.http.get(url, { headers })
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
    return this.http.post(`${this.backendUrl}/scan-results/sonar`, { repoUrl }, { headers })
      .pipe(catchError(this.handleError));
  }

  scanWithTrivy(repoUrl: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.backendUrl}/scan-results/trivy`, { repoUrl }, { headers })
      .pipe(catchError(this.handleError));
  }

  scanWithSnyk(repoUrl: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.backendUrl}/scan-results/snyk`, { repoUrl }, { headers })
      .pipe(catchError(this.handleError));
  }

  scanWithOWASP(repoUrl: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.backendUrl}/scan-results/owasp`, { repoUrl }, { headers })
      .pipe(catchError(this.handleError));
  }

  post(endpoint: string, data: any): Observable<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post(`${this.backendUrl}${endpoint}`, data, { 
      headers,
      withCredentials: true // Important pour CORS avec credentials
    }).pipe(
      tap(response => console.log(`POST ${endpoint} response:`, response)),
      catchError(error => {
        console.error(`Error in POST ${endpoint}:`, error);
        if (error.status === 401) {
          // Token expiré ou invalide
          localStorage.removeItem('auth_token');
          return throwError(() => new Error('Session expired. Please login again.'));
        } else if (error.status === 0) {
          // Problème de connexion
          return throwError(() => new Error('Cannot connect to server. Please check your connection.'));
        }
        return throwError(() => error);
      })
    );
  }

  // Centralized error handling
  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    
    let errorMessage = 'An error occurred. Please try again.';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 0:
          errorMessage = 'Cannot connect to server. Please check your connection.';
          break;
        case 401:
          errorMessage = 'Session expired. Please login again.';
          localStorage.removeItem('auth_token');
          break;
        case 403:
          errorMessage = 'Access denied. You do not have the required permissions.';
          break;
        case 404:
          errorMessage = 'Resource not found.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error && error.error.errors) {
            errorMessage = error.error.errors.map((err: any) => err.msg).join(', ');
          }
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
