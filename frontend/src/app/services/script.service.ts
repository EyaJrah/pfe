import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ScriptService {
  private readonly backendUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  runScript(repoUrl: string): Observable<any> {
    console.log('Calling API at:', `${this.backendUrl}/scan-results/scan-all`);
    return this.http.post<any>(`${this.backendUrl}/scan-results/scan-all`, { githubUrl: repoUrl });
  }

  runScanAndSend(repoUrl: string): Observable<any> {
    console.log('Calling API at:', `${this.backendUrl}/scan-results/scan-all`);
    return this.http.post<any>(`${this.backendUrl}/scan-results/scan-all`, { githubUrl: repoUrl });
  }
} 