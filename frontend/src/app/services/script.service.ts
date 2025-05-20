import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ScriptService {
  private readonly backendUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  runScript(repoUrl: string): Observable<any> {
    const params = new HttpParams().set('repoUrl', repoUrl);
    return this.http.get<any>(`${this.backendUrl}/run-script`, { params });
  }

  runScanAndSend(repoUrl: string): Observable<any> {
    const params = new HttpParams().set('repoUrl', repoUrl);
    return this.http.get<any>(`${this.backendUrl}/run-script`, { params });
  }
} 