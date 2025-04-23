import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScanResultsService, ScanMetrics, ScanResults, BaseVulnerability, OwaspVulnerability } from '../../services/scan-results.service';
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';

@Component({
  selector: 'app-scan-results',
  templateUrl: './scan-results.component.html',
  styleUrls: ['./scan-results.component.scss']
})
export class ScanResultsComponent implements OnInit {
  sonarMetrics: ScanMetrics | null = null;
  trivyResults: ScanResults | null = null;
  snykResults: ScanResults | null = null;
  owaspResults: ScanResults | null = null;
  
  loading = false;
  error: string | null = null;
  repositoryUrl: string | null = null;

  constructor(
    private scanResultsService: ScanResultsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.repositoryUrl = params['repo'];
      if (this.repositoryUrl) {
        this.loadScanResults(this.repositoryUrl);
      }
    });
  }

  isOwaspVulnerability(vulnerability: BaseVulnerability | OwaspVulnerability): vulnerability is OwaspVulnerability {
    return 'name' in vulnerability && 'solution' in vulnerability;
  }

  private loadScanResults(repoUrl: string) {
    this.loading = true;
    this.error = null;

    // Check for authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.error = 'Authentication required. Please log in.';
      this.loading = false;
      // Redirect to login page or handle authentication
      return;
    }

    const sonar$ = this.scanResultsService.getSonarResults(repoUrl).pipe(
      catchError(error => {
        console.error('SonarCloud scan error:', error);
        return of(null);
      })
    );

    const trivy$ = this.scanResultsService.getTrivyResults(repoUrl).pipe(
      catchError(error => {
        console.error('Trivy scan error:', error);
        return of(null);
      })
    );

    const snyk$ = this.scanResultsService.getSnykResults(repoUrl).pipe(
      catchError(error => {
        console.error('Snyk scan error:', error);
        return of(null);
      })
    );

    const owasp$ = this.scanResultsService.getOwaspResults(repoUrl).pipe(
      catchError(error => {
        console.error('OWASP scan error:', error);
        return of(null);
      })
    );

    forkJoin({
      sonar: sonar$,
      trivy: trivy$,
      snyk: snyk$,
      owasp: owasp$
    }).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (results) => {
        this.sonarMetrics = results.sonar;
        this.trivyResults = results.trivy;
        this.snykResults = results.snyk;
        this.owaspResults = results.owasp;

        if (!this.sonarMetrics && !this.trivyResults && !this.snykResults && !this.owaspResults) {
          this.error = 'No scan results were retrieved. Please check your repository URL and try again.';
        }
      },
      error: (error) => {
        console.error('Error loading scan results:', error);
        this.error = 'Failed to load scan results. Please try again later.';
      }
    });
  }

  retryScans() {
    if (this.repositoryUrl) {
      this.loadScanResults(this.repositoryUrl);
    }
  }
}