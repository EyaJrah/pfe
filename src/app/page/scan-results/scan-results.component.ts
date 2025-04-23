import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../api.service';
import { CommonModule } from '@angular/common';

interface SonarMeasure {
  metric: string;
  value: string;
  bestValue: boolean;
}

interface SonarComponent {
  id: string;
  key: string;
  name: string;
  qualifier: string;
  measures: SonarMeasure[];
}

interface SonarResponse {
  component: SonarComponent;
}

interface SnykResponse {
  vulnerabilities: any[];
  ok: boolean;
  dependencyCount: number;
  summary: string;
}

interface Vulnerability {
  title: string;
  severity: string;
  description: string;
  solution?: string;
}

interface ScanResults {
  sonar: SonarResponse;
  snyk: SnykResponse;
  trivy: Vulnerability[];
  owasp: Vulnerability[];
}

@Component({
  selector: 'app-scan-results',
  templateUrl: './scan-results.component.html',
  styleUrls: ['./scan-results.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ScanResultsComponent implements OnInit {
  loading = false;
  error: string | null = null;
  repositoryUrl: string | null = null;
  
  scanResults: ScanResults = {
    sonar: {
      component: {
        id: "AZYe-T4LoevWM1RV8sjT",
        key: "EyaJrah_pfe",
        name: "pfe",
        qualifier: "TRK",
        measures: [
          {
            metric: "bugs",
            value: "0",
            bestValue: true
          },
          {
            metric: "code_smells",
            value: "68",
            bestValue: false
          },
          {
            metric: "vulnerabilities",
            value: "3",
            bestValue: false
          }
        ]
      }
    },
    snyk: {
      vulnerabilities: [],
      ok: true,
      dependencyCount: 287,
      summary: "No known vulnerabilities"
    },
    trivy: [],
    owasp: []
  };

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.repositoryUrl = params['repo'];
      if (this.repositoryUrl) {
        this.loadScanResults();
      } else {
        this.error = 'No repository URL provided';
      }
    });
  }

  loadScanResults(): void {
    this.loading = true;
    this.apiService.getScanResults().subscribe(
      (data: any) => {
        if (data.sonar) {
          this.scanResults.sonar = data.sonar;
        }
        if (data.snyk) {
          this.scanResults.snyk = data.snyk;
        }
        if (data.trivy) {
          this.scanResults.trivy = data.trivy;
        }
        if (data.owasp) {
          this.scanResults.owasp = data.owasp;
        }
        this.loading = false;
      },
      error => {
        console.error('Error fetching scan results:', error);
        this.loading = false;
        this.error = 'Error loading scan results';
      }
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.router.navigate(['/login']);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  retryScans(): void {
    this.loadScanResults();
  }
}
