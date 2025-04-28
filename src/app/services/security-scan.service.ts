import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SecurityScanService {
  private readonly backendUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  /**
   * Run all security scans for a repository
   * @param repositoryUrl The GitHub repository URL
   * @returns Observable with all scan results
   */
  runAllScans(repositoryUrl: string): Observable<any> {
    return this.http.post(
      `${this.backendUrl}/scan-results/scan-all`,
      { repositoryUrl },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Run Trivy scan for a repository
   * @param repositoryPath The local path to the repository
   * @returns Observable with Trivy scan results
   */
  runTrivyScan(repositoryPath: string): Observable<any> {
    return this.http.post(
      `${this.backendUrl}/scan-results/trivy`,
      {
        repositoryPath,
        options: {
          cacheDir: '~/.cache/trivy',
          scanners: ['vuln', 'secret'],
          includeDevDeps: true,
          severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        }
      },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Run SonarCloud scan for a repository
   * @param projectKey The SonarCloud project key
   * @returns Observable with SonarCloud scan results
   */
  runSonarCloudScan(projectKey: string): Observable<any> {
    return this.http.post(
      `${this.backendUrl}/scan-results/sonarcloud`,
      { projectKey },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Run Snyk scan for a repository
   * @param repositoryPath The local path to the repository
   * @returns Observable with Snyk scan results
   */
  runSnykScan(repositoryPath: string): Observable<any> {
    return this.http.post(
      `${this.backendUrl}/scan-results/snyk`,
      {
        repositoryPath,
        options: {
          scanAllUnmanaged: true,
          json: true
        }
      },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Run OWASP Dependency Check for a repository
   * @param repositoryPath The local path to the repository
   * @param projectName The name of the project
   * @returns Observable with OWASP Dependency Check results
   */
  runDependencyCheck(repositoryPath: string, projectName: string): Observable<any> {
    return this.http.post(
      `${this.backendUrl}/scan-results/dependency-check`,
      {
        repositoryPath,
        projectName,
        options: {
          format: 'JSON',
          out: './dc-report'
        }
      },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get scan results for a repository
   * @param repositoryUrl The GitHub repository URL
   * @returns Observable with scan results
   */
  getScanResults(repositoryUrl: string): Observable<any> {
    return this.http.get(
      `${this.backendUrl}/scan-results/results`,
      {
        params: { repositoryUrl },
        headers: this.getAuthHeaders()
      }
    );
  }
} 