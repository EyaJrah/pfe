import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ScriptService {
  private readonly backendUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  runScript(repoUrl: string): Observable<any> {
    return this.http.get<any>(`${this.backendUrl}/run-script`, { params: { repoUrl } });
  }

  runScanAndSend(repoUrl: string): Observable<any> {
    return this.http.get<any>(`${this.backendUrl}/run-script`, { params: { repoUrl } });
  }
} 