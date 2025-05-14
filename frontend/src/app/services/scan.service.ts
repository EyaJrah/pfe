import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScanService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  startScan(repositoryUrl: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/scan`, { repositoryUrl });
  }

  getHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
} 