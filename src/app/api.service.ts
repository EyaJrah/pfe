import { environment } from './../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl; // Your backend API URL

  constructor(private http: HttpClient) { }

  // Signup method
  signup(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/signup`, { name, email, password });
  }

  // Login method
  login(email: string, password: string): Observable<any> {
    const body = { email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log('Sending login request:', body);
    return this.http.post<any>(`${this.apiUrl}/auth/login`, body, { headers })
      .pipe(
        tap(response => {
          // Store the token in localStorage (or sessionStorage)
          localStorage.setItem('authToken', response.token);
        })
      );
  }
  
  

  // Get Profile method
  getProfile(): Observable<any> {
    const token = localStorage.getItem('authToken'); // Retrieve token
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/users/profile`, { headers });
  }
  

  // Update Profile method
  updateProfile(token: string, name: string, email: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.apiUrl}/users/profile`, { name, email }, { headers });
  }
}