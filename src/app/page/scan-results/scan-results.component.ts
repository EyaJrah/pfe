import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RouterModule } from '@angular/router';
import { ScriptService } from '../../services/script.service';

interface SonarMeasure {
  metric: string;
  value: string;
}

interface SonarComponent {
  id: string;
  key: string;
  name: string;
  qualifier: string;
  measures: SonarMeasure[];
}

interface SonarIssue {
  key: string;
  rule: string;
  severity: string;
  component: string;
  project: string;
  line?: number;
  message: string;
  type: string;
  status: string;
}

interface SnykVulnerability {
  id: string;
  title: string;
  packageName: string;
  severity: string;
  description: string;
}

interface OwaspVulnerability {
  cve: string;
  component: string;
  version: string;
  severity: string;
  cwe: string;
  cvss: string;
  description: string;
}

interface ScanResults {
  overallScore: number;
  totalVulnerabilities: number;
  criticalIssues: number;
  codeQuality: number;
  securityScore: number;
  snyk: {
    status: string;
    ok: boolean;
    summary: string;
    metrics: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    vulnerabilities: SnykVulnerability[];
  };
  sonar: {
    component: SonarComponent;
    issues: SonarIssue[];
  };
  trivy: Array<{
    Target: string;
    Vulnerabilities: Array<{
      VulnerabilityID: string;
      PkgName: string;
      InstalledVersion: string;
      FixedVersion: string;
      Severity: string;
      Title: string;
      Description: string;
    }>;
  }>;
  owasp: {
    status: string;
    totalVulnerabilities: number;
    metrics: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    vulnerabilities: OwaspVulnerability[];
  };
}

@Component({
  selector: 'app-scan-results',
  templateUrl: './scan-results.component.html',
  styleUrls: ['./scan-results.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class ScanResultsComponent implements OnInit {
  loading = false;
  error: string | null = null;
  repositoryUrl: string | null = null;
  private readonly backendUrl = environment.apiUrl;
  
  scanResults: ScanResults = {
    overallScore: 0,
    totalVulnerabilities: 0,
    criticalIssues: 0,
    codeQuality: 0,
    securityScore: 0,
    snyk: {
      status: 'pending',
      ok: true,
      summary: '',
      metrics: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      vulnerabilities: []
    },
    sonar: {
      component: {
        id: '',
        key: '',
        name: '',
        qualifier: '',
        measures: []
      },
      issues: []
    },
    trivy: [],
    owasp: {
      status: 'pending',
      totalVulnerabilities: 0,
      metrics: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      vulnerabilities: []
    }
  };

  // Add new properties for detail toggles
  showSnykDetails = false;
  showSonarDetails = false;
  showTrivyDetails = false;
  showOwaspDetails = false;

  snykVulns: any[] = [];
  trivyVulns: any[] = [];
  owaspVulns: any[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private scriptService: ScriptService
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
    this.error = null;
    this.runNewScans();
  }

  runNewScans(): void {
    this.loading = true;
    this.error = null;
    this.scriptService.runScanAndSend(this.repositoryUrl!).subscribe({
      next: (data) => {
        this.scanResults = this.mapBackendResultsToScanResults(data);
        this.snykVulns = data.snykVulns || [];
        this.trivyVulns = data.trivyVulns || [];
        this.owaspVulns = data.owaspVulns || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error running security scans:', error);
        this.error = 'Error running security scans. Please try again later.';
        this.loading = false;
      }
    });
  }

  private mapBackendResultsToScanResults(data: any): ScanResults {
    // Snyk
    const snyk = data.snyk || {};
    const snykVulns = Array.isArray(snyk.vulnerabilities) ? snyk.vulnerabilities : [];
    const snykMetrics = {
      critical: snykVulns.filter((v: any) => v.severity === 'critical').length,
      high: snykVulns.filter((v: any) => v.severity === 'high').length,
      medium: snykVulns.filter((v: any) => v.severity === 'medium').length,
      low: snykVulns.filter((v: any) => v.severity === 'low').length,
    };

    // Trivy
    let trivyResults = [];
    if (data.trivy && Array.isArray(data.trivy.Results)) {
      trivyResults = data.trivy.Results.map((result: any) => ({
        Target: result.Target,
        Vulnerabilities: Array.isArray(result.Vulnerabilities) ? result.Vulnerabilities : []
      }));
    } else if (Array.isArray(data.trivy)) {
      trivyResults = data.trivy.map((result: any) => ({
        Target: result.Target,
        Vulnerabilities: Array.isArray(result.Vulnerabilities) ? result.Vulnerabilities : []
      }));
    }

    // OWASP Dependency Check (corrigé)
    const owasp = data.owasp || {};
    const owaspVulns = Array.isArray(owasp.dependencies)
      ? owasp.dependencies.flatMap((dep: any) =>
          (dep.vulnerabilities || []).map((vuln: any) => ({
            cve: vuln.name,
            component: dep.fileName,
            version: dep.version,
            severity: vuln.severity,
            cwe: vuln.cwe,
            cvss: vuln.cvssv3 || vuln.cvssv2,
            description: vuln.description
          }))
        )
      : [];
    const owaspMetrics = {
      critical: owaspVulns.filter((v: any) => v.severity?.toLowerCase() === 'critical').length,
      high: owaspVulns.filter((v: any) => v.severity?.toLowerCase() === 'high').length,
      medium: owaspVulns.filter((v: any) => v.severity?.toLowerCase() === 'medium').length,
      low: owaspVulns.filter((v: any) => v.severity?.toLowerCase() === 'low').length,
    };

    // SonarCloud (corrigé)
    const sonarComponent = data.sonarcloud?.sonarcloud_metrics?.component || { id: '', key: '', name: '', qualifier: '', measures: [] };
    const sonarIssues = data.sonarcloud?.sonarcloud_vulnerabilities?.issues || [];

    // Calculs globaux
    const totalVulns = snykVulns.length + trivyResults.reduce((acc: number, curr: any) => acc + (curr.Vulnerabilities?.length || 0), 0) + owaspVulns.length;
    const criticalIssues = snykMetrics.critical + trivyResults.reduce((acc: number, curr: any) => acc + (curr.Vulnerabilities?.filter((v: any) => v.Severity === 'CRITICAL').length || 0), 0) + owaspMetrics.critical;

    // Score amélioré avec pondération
    const overallScore = this.calculateSonarScore({
      snyk: snykMetrics,
      trivy: {
        critical: trivyResults.reduce((acc: number, curr: any) => acc + (curr.Vulnerabilities?.filter((v: any) => v.Severity === 'CRITICAL').length || 0), 0),
        high: trivyResults.reduce((acc: number, curr: any) => acc + (curr.Vulnerabilities?.filter((v: any) => v.Severity === 'HIGH').length || 0), 0),
        medium: trivyResults.reduce((acc: number, curr: any) => acc + (curr.Vulnerabilities?.filter((v: any) => v.Severity === 'MEDIUM').length || 0), 0),
        low: trivyResults.reduce((acc: number, curr: any) => acc + (curr.Vulnerabilities?.filter((v: any) => v.Severity === 'LOW').length || 0), 0),
      },
      owasp: owaspMetrics,
      sonar: this.getSonarMetrics()
    });

    return {
      overallScore,
      totalVulnerabilities: totalVulns,
      criticalIssues,
      codeQuality: this.calculateCodeQuality(sonarComponent.measures),
      securityScore: overallScore,
      snyk: {
        status: snyk.status || '',
        ok: snyk.ok !== undefined ? snyk.ok : snykVulns.length === 0,
        summary: typeof snyk.summary === 'string' ? snyk.summary : '',
        metrics: snykMetrics,
        vulnerabilities: snykVulns
      },
      sonar: {
        component: sonarComponent,
        issues: sonarIssues
      },
      trivy: trivyResults,
      owasp: {
        status: owasp.status || '',
        totalVulnerabilities: owaspVulns.length,
        metrics: {
          critical: owaspVulns.filter((v: any) => v.severity?.toLowerCase() === 'critical').length,
          high: owaspVulns.filter((v: any) => v.severity?.toLowerCase() === 'high').length,
          medium: owaspVulns.filter((v: any) => v.severity?.toLowerCase() === 'medium').length,
          low: owaspVulns.filter((v: any) => v.severity?.toLowerCase() === 'low').length,
        },
        vulnerabilities: owaspVulns
      }
    };
  }

 

  private calculateCodeQuality(measures: any[]): number {
    if (!measures || measures.length === 0) return 0;

    const metrics = {
      bugs: this.getMetricValue(measures, 'bugs'),
      codeSmells: this.getMetricValue(measures, 'code_smells'),
      coverage: this.getMetricValue(measures, 'coverage'),
      duplications: this.getMetricValue(measures, 'duplicated_lines_density')
    };

    // Pondération des métriques
    const weights = {
      bugs: 0.3,
      codeSmells: 0.2,
      coverage: 0.3,
      duplications: 0.2
    };

    // Calcul du score
    const score = (
      (Math.max(0, 100 - metrics.bugs * 10) * weights.bugs) +
      (Math.max(0, 100 - metrics.codeSmells * 5) * weights.codeSmells) +
      (metrics.coverage * weights.coverage) +
      (Math.max(0, 100 - metrics.duplications) * weights.duplications)
    );

    return Math.round(score);
  }

  private getMetricValue(measures: any[], metricKey: string): number {
    const measure = measures.find(m => m.metric === metricKey);
    return measure ? parseFloat(measure.value) : 0;
  }

  private calculateSonarScore(metrics: any): number {
    const weights = {
      bugs: 0.4,
      codeSmells: 0.3,
      coverage: 0.2,
      duplications: 0.1
    };

    return (
      (Math.max(0, 100 - metrics.bugs * 10) * weights.bugs) +
      (Math.max(0, 100 - metrics.codeSmells * 5) * weights.codeSmells) +
      (metrics.coverage * weights.coverage) +
      (Math.max(0, 100 - metrics.duplications) * weights.duplications)
    );
  }

  getTrivyVulnerabilities(severity: string): number {
    if (!this.scanResults.trivy?.length) return 0;
    
    return this.scanResults.trivy.filter(vuln => vuln.Vulnerabilities.some(v => v.Severity.toLowerCase() === severity.toLowerCase())).length;
  }

  getTotalTrivyVulnerabilities(): number {
    if (!this.scanResults.trivy?.length) return 0;
    return this.scanResults.trivy.length;
  }

  getTrivyTargets(): string[] {
    if (!this.scanResults.trivy?.length) return [];
    return [...new Set(this.scanResults.trivy.map(vuln => vuln.Target))];
  }

  getSnykVulnerabilities(severity: string): number {
    if (!this.scanResults.snyk?.vulnerabilities) {
      return 0;
    }
    return this.scanResults.snyk.vulnerabilities.filter(
      vuln => vuln.severity.toLowerCase() === severity.toLowerCase()
    ).length;
  }

  getTotalSnykVulnerabilities(): number {
    if (!this.scanResults.snyk?.vulnerabilities) {
      return 0;
    }
    return this.scanResults.snyk.vulnerabilities.length;
  }

  getBugCount(): number {
    const metrics = this.scanResults.sonar?.component?.measures;
    return metrics ? this.getMetricValue(metrics, 'bugs') : 0;
  }

  getCodeSmellCount(): number {
    const metrics = this.scanResults.sonar?.component?.measures;
    return metrics ? this.getMetricValue(metrics, 'code_smells') : 0;
  }

  getCoverage(): number {
    const metrics = this.scanResults.sonar?.component?.measures;
    return metrics ? this.getMetricValue(metrics, 'coverage') : 0;
  }

  getDuplication(): number {
    const metrics = this.scanResults.sonar?.component?.measures;
    return metrics ? this.getMetricValue(metrics, 'duplicated_lines_density') : 0;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.router.navigate(['/login']);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  retryScans(): void {
    this.runNewScans();
  }

  getTotalOwaspVulnerabilities(): number {
    return this.scanResults.owasp.vulnerabilities.length;
  }

  getOwaspVulnerabilities(severity: string): number {
    return this.scanResults.owasp.vulnerabilities.filter(
      vuln => vuln.severity.toLowerCase() === severity.toLowerCase()
    ).length;
  }

  // Overall Score Methods
  getOverallScore(): number {
    const snykScore = this.scanResults.snyk?.metrics ? 100 : 0;
    const sonarScore = this.getSonarScore();
    const trivyScore = this.getTrivyScore();
    
    const weights = { snyk: 0.4, sonar: 0.3, trivy: 0.3 };
    return Math.round(
      (snykScore * weights.snyk) +
      (sonarScore * weights.sonar) +
      (trivyScore * weights.trivy)
    );
  }

  getOverallScoreClass(): string {
    const score = this.getOverallScore();
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
  }

  getOverallScoreLabel(): string {
    const score = this.getOverallScore();
    if (score >= 80) return 'Good Security Posture';
    if (score >= 60) return 'Moderate Security Concerns';
    return 'Significant Security Issues';
  }

  getOverallScoreDescription(): string {
    const score = this.getOverallScore();
    if (score >= 80) return 'Your repository has good security practices in place.';
    if (score >= 60) return 'There are some security concerns that should be addressed.';
    return 'There are significant security issues that need immediate attention.';
  }

  // Quick Stats Methods
  getTotalVulnerabilities(): number {
    return (
      this.getSnykVulnerabilities('critical') +
      this.getSnykVulnerabilities('high') +
      this.getSnykVulnerabilities('medium') +
      this.getSnykVulnerabilities('low') +
      this.getTrivyTotalVulnerabilities()
    );
  }

  getCriticalVulnerabilities(): number {
    return (
      this.getSnykVulnerabilities('critical') +
      this.getTrivyCriticalVulnerabilities()
    );
  }

  getCodeQualityScore(): number {
    return this.getSonarScore();
  }

  getSecurityScore(): number {
    return this.getOverallScore();
  }

  // Snyk Methods
  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'fa-exclamation-circle';
      case 'high': return 'fa-exclamation-triangle';
      case 'medium': return 'fa-exclamation';
      case 'low': return 'fa-info-circle';
      default: return 'fa-question-circle';
    }
  }

  toggleSnykDetails(): void {
    this.showSnykDetails = !this.showSnykDetails;
  }

  // SonarCloud Methods
  toggleSonarDetails(): void {
    this.showSonarDetails = !this.showSonarDetails;
  }

  getSonarScore(): number {
    if (!this.scanResults.sonar?.component.measures) return 0;
    
    const metrics = this.scanResults.sonar.component.measures;
    const reliability = this.getMetricValue(metrics, 'bugs');
    const security = this.getMetricValue(metrics, 'code_smells');
    const maintainability = this.getMetricValue(metrics, 'coverage');
    
    // Convert metrics to scores (higher is better)
    const reliabilityScore = Math.max(0, 100 - (reliability * 10));
    const securityScore = Math.max(0, 100 - (security * 5));
    const maintainabilityScore = maintainability;
    
    // Weight the scores
    const weights = {
      reliability: 0.4,
      security: 0.4,
      maintainability: 0.2
    };
    
    return Math.round(
      (reliabilityScore * weights.reliability) +
      (securityScore * weights.security) +
      (maintainabilityScore * weights.maintainability)
    );
  }

  // Trivy Methods
  toggleTrivyDetails(): void {
    this.showTrivyDetails = !this.showTrivyDetails;
  }

  getTrivyTotalVulnerabilities(): number {
    if (!this.scanResults.trivy?.length) return 0;
    // Additionner toutes les vulnérabilités de chaque cible
    return this.scanResults.trivy.reduce((acc, curr) => acc + (curr.Vulnerabilities?.length || 0), 0);
  }

  getTrivyCriticalVulnerabilities(): number {
    return this.getTrivyVulnerabilitiesBySeverity('CRITICAL');
  }

  getTrivyHighVulnerabilities(): number {
    return this.getTrivyVulnerabilitiesBySeverity('HIGH');
  }

  getTrivyMediumVulnerabilities(): number {
    return this.getTrivyVulnerabilitiesBySeverity('MEDIUM');
  }

  getTrivyLowVulnerabilities(): number {
    return this.getTrivyVulnerabilitiesBySeverity('LOW');
  }

  getTrivyScore(): number {
    const total = this.getTrivyTotalVulnerabilities();
    if (total === 0) return 100;
    
    // Weight critical and high vulnerabilities more heavily
    const critical = this.getTrivyCriticalVulnerabilities();
    const high = this.getTrivyHighVulnerabilities();
    const medium = this.getTrivyMediumVulnerabilities();
    const low = this.getTrivyLowVulnerabilities();
    
    // Calculate weighted score (lower is better)
    const weightedScore = (
      (critical * 10) +  // Critical vulnerabilities heavily impact score
      (high * 5) +       // High vulnerabilities significantly impact score
      (medium * 2) +     // Medium vulnerabilities moderately impact score
      (low * 1)          // Low vulnerabilities slightly impact score
    );
    
    // Convert to a 0-100 scale (inverted)
    return Math.max(0, 100 - weightedScore);
  }

  private getTrivyVulnerabilitiesBySeverity(severity: string): number {
    if (!this.scanResults.trivy?.length) return 0;
    // Correction : on vérifie que v.Severity existe avant d'appeler .toLowerCase()
    return this.scanResults.trivy.reduce(
      (acc, curr) =>
        acc +
        (curr.Vulnerabilities
          ? curr.Vulnerabilities.filter(
              v => v.Severity && v.Severity.toLowerCase() === severity.toLowerCase()
            ).length
          : 0),
      0
    );
  }

  // Toggle methods for details sections
  toggleOwaspDetails(): void {
    this.showOwaspDetails = !this.showOwaspDetails;
  }

  getSonarMetrics(): any {
    if (!this.scanResults?.sonar?.component?.measures) {
      return {
        bugs: 0,
        codeSmells: 0,
        coverage: 0,
        duplications: 0
      };
    }
    
    const metrics = this.scanResults.sonar.component.measures;
    return {
      bugs: this.getMetricValue(metrics, 'bugs'),
      codeSmells: this.getMetricValue(metrics, 'code_smells'),
      coverage: this.getMetricValue(metrics, 'coverage'),
      duplications: this.getMetricValue(metrics, 'duplicated_lines_density')
    };
  }

  getSonarChartData(): any[] {
    if (!this.scanResults?.sonar?.component?.measures) {
      return [];
    }

    const metrics = this.scanResults.sonar.component.measures;
    return [
      { name: 'Bugs', value: this.getMetricValue(metrics, 'bugs') },
      { name: 'Code Smells', value: this.getMetricValue(metrics, 'code_smells') },
      { name: 'Coverage', value: this.getMetricValue(metrics, 'coverage') },
      { name: 'Duplications', value: this.getMetricValue(metrics, 'duplicated_lines_density') }
    ];
  }

  getSonarIssues(): Array<{ severity: string; message: string; component: string }> {
    return this.scanResults.sonar?.issues || [];
  }
}
