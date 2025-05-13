import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ScriptService {
  constructor(private http: HttpClient) {}

  runScript(repoUrl: string): Observable<any> {
    return this.http.get<any>('http://localhost:5000/api/run-script', { params: { repoUrl } });
  }

  runScanAndSend(repoUrl: string): Observable<any> {
    return this.http.get<any>('http://localhost:5000/api/run-script', { params: { repoUrl } });
  }
} 