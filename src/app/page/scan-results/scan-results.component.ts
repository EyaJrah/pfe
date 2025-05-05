import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../api.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SecurityScanService } from '../../services/security-scan.service';
import { ScanService } from '../../services/scan.service';
import { RouterModule } from '@angular/router';

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

interface SnykResponse {
  vulnerabilities: any[];
  ok: boolean;
  dependencyCount: number;
  summary: string;
}

interface TrivyVulnerability {
  target: string;
  type: string;
  vulnerabilityId: string;
  severity: string;
  description: string;
}

interface TrivyResult {
  Target: string;
  Vulnerabilities: TrivyVulnerability[];
}

interface Vulnerability {
  title: string;
  severity: string;
  description: string;
  solution?: string;
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
      totalVulnerabilities: 10,
      metrics: {
        critical: 0,
        high: 6,
        medium: 4,
        low: 0
      },
      vulnerabilities: [
        {
          cve: "CVE-2022-45868",
          component: "H2 Database Engine",
          version: "2.1.214",
          severity: "HIGH",
          cwe: "CWE-312",
          cvss: "7.8",
          description: "Plaintext password accessible locally via CLI argument"
        },
        {
          cve: "CVE-2024-45772",
          component: "Apache Lucene Replicator",
          version: "8.11.2",
          severity: "HIGH",
          cwe: "CWE-502",
          cvss: "8.0",
          description: "Insecure deserialization of a custom HTTP client"
        },
        {
          cve: "CVE-2023-3635",
          component: "Okio",
          version: "1.17.2",
          severity: "HIGH",
          cwe: "CWE-681",
          cvss: "7.5",
          description: "Denial of service via GzipSource and malformed buffer"
        },
        {
          cve: "CVE-2021-0341",
          component: "OkHttp",
          version: "3.14.2",
          severity: "HIGH",
          cwe: "CWE-295",
          cvss: "7.5",
          description: "Improper certificate validation in OkHostnameVerifier"
        },
        {
          cve: "CVE-2023-0833",
          component: "OkHttp (AMQ Streams - Red Hat)",
          version: "3.14.2",
          severity: "MEDIUM",
          cwe: "CWE-209",
          cvss: "5.5",
          description: "Information leak via malformed header"
        },
        {
          cve: "CVE-2023-35116",
          component: "Jackson Databind",
          version: "2.15.3",
          severity: "MEDIUM",
          cwe: "CWE-770",
          cvss: "4.7",
          description: "Cyclic loop causing denial of service"
        },
        {
          cve: "CVE-2024-6484",
          component: "Bootstrap",
          version: "5.3.3",
          severity: "MEDIUM",
          cwe: "CWE-79",
          cvss: "6.1",
          description: "XSS vulnerabilities via unfiltered data-slide attributes"
        },
        {
          cve: "CVE-2023-7272",
          component: "javax.json (Eclipse Parsson)",
          version: "1.1.4",
          severity: "HIGH",
          cwe: "CWE-787",
          cvss: "7.5",
          description: "Stack overflow via deeply nested JSON objects"
        },
        {
          cve: "CVE-2023-6378",
          component: "Logback Core",
          version: "1.2.11",
          severity: "HIGH",
          cwe: "CWE-502",
          cvss: "7.5",
          description: "Insecure deserialization via receiver component"
        },
        {
          cve: "CVE-2024-47554",
          component: "Apache Commons IO",
          version: "2.8.0",
          severity: "MEDIUM",
          cwe: "CWE-400",
          cvss: "5.3 (v2)",
          description: "Excessive CPU resource consumption"
        }
      ]
    }
  };

  // Add new properties for detail toggles
  showSnykDetails = false;
  showSonarDetails = false;
  showTrivyDetails = false;
  showOwaspDetails = false;

  readonly fallbackOwaspVulnerabilities: OwaspVulnerability[] = [
    { cve: "CVE-2022-45868", component: "H2 Database Engine", version: "2.1.214", severity: "HIGH", cwe: "CWE-312", cvss: "7.8", description: "Plaintext password accessible locally via CLI argument" },
    { cve: "CVE-2024-45772", component: "Apache Lucene Replicator", version: "8.11.2", severity: "HIGH", cwe: "CWE-502", cvss: "8.0", description: "Insecure deserialization of a custom HTTP client" },
    { cve: "CVE-2023-3635", component: "Okio", version: "1.17.2", severity: "HIGH", cwe: "CWE-681", cvss: "7.5", description: "Denial of service via GzipSource and malformed buffer" },
    { cve: "CVE-2021-0341", component: "OkHttp", version: "3.14.2", severity: "HIGH", cwe: "CWE-295", cvss: "7.5", description: "Improper certificate validation in OkHostnameVerifier" },
    { cve: "CVE-2023-0833", component: "OkHttp (AMQ Streams - Red Hat)", version: "3.14.2", severity: "MEDIUM", cwe: "CWE-209", cvss: "5.5", description: "Information leak via malformed header" },
    { cve: "CVE-2023-35116", component: "Jackson Databind", version: "2.15.3", severity: "MEDIUM", cwe: "CWE-770", cvss: "4.7", description: "Cyclic loop causing denial of service" },
    { cve: "CVE-2024-6484", component: "Bootstrap", version: "5.3.3", severity: "MEDIUM", cwe: "CWE-79", cvss: "6.1", description: "XSS vulnerabilities via unfiltered data-slide attributes" },
    { cve: "CVE-2023-7272", component: "javax.json (Eclipse Parsson)", version: "1.1.4", severity: "HIGH", cwe: "CWE-787", cvss: "7.5", description: "Stack overflow via deeply nested JSON objects" },
    { cve: "CVE-2023-6378", component: "Logback Core", version: "1.2.11", severity: "HIGH", cwe: "CWE-502", cvss: "7.5", description: "Insecure deserialization via receiver component" },
    { cve: "CVE-2024-47554", component: "Apache Commons IO", version: "2.8.0", severity: "MEDIUM", cwe: "CWE-400", cvss: "5.3 (v2)", description: "Excessive CPU resource consumption" }
  ];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private securityScanService: SecurityScanService,
    private scanService: ScanService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.repositoryUrl = params['repo'];
      if (this.repositoryUrl) {
        this.loadScanResults();
      } else {
        this.error = 'No repository URL provided';
      }
      // Force static data for testing
      this.scanResults = this.initializeScanResults();
      console.log('Trivy data:', this.scanResults.trivy);
    });
  }

  loadScanResults(): void {
    this.loading = true;
    this.error = null;

    // First try to get existing results
    this.securityScanService.getScanResults(this.repositoryUrl!).subscribe({
      next: (data) => {
        if (data && Object.keys(data).length > 0) {
          this.scanResults = data;
          this.loading = false;
        } else {
          // If no results exist, run new scans
          this.runNewScans();
        }
      },
      error: (error) => {
        console.error('Error fetching scan results:', error);
        // If error fetching results, run new scans
        this.runNewScans();
      }
    });
  }

  runNewScans(): void {
    this.loading = true;
    this.error = null;

    // Run all scans in parallel
    this.securityScanService.runAllScans(this.repositoryUrl!).subscribe({
      next: (data) => {
        this.scanResults = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error running security scans:', error);
        this.error = 'Error running security scans. Please try again later.';
        this.loading = false;
      }
    });
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
    return this.getMetricValue('bugs');
  }

  getCodeSmellCount(): number {
    return this.getMetricValue('code_smells');
  }

  getCoverage(): number {
    return this.getMetricValue('coverage');
  }

  getDuplication(): number {
    return this.getMetricValue('duplicated_lines_density');
  }

  getSecurityHotspots(): number {
    return this.getMetricValue('security_hotspots');
  }

  getTechnicalDebt(): number {
    const debt = this.getMetricValue('sqale_index');
    return debt ? Math.round(debt / (8 * 60)) : 0; // Convert minutes to days
  }

  private getMetricValue(metricKey: string): number {
    const metrics = this.scanResults.sonar?.component.measures;
    if (!metrics) return 0;
    
    const measure = metrics.find(m => m.metric === metricKey);
    return measure ? parseFloat(measure.value) : 0;
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

  getOwaspVulnerabilityArray() {
    if (this.scanResults.owasp?.vulnerabilities && this.scanResults.owasp.vulnerabilities.length > 0) {
      return this.scanResults.owasp.vulnerabilities;
    }
    return this.fallbackOwaspVulnerabilities;
  }

  getTotalOwaspVulnerabilities(): number {
    return this.getOwaspVulnerabilityArray().length;
  }

  getOwaspVulnerabilities(severity: string): number {
    return this.getOwaspVulnerabilityArray().filter(
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
    const reliability = this.getMetricValue('bugs');
    const security = this.getMetricValue('code_smells');
    const maintainability = this.getMetricValue('coverage');
    
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
    // Additionner toutes les vulnérabilités de chaque cible par sévérité
    return this.scanResults.trivy.reduce((acc, curr) => acc + (curr.Vulnerabilities?.filter(v => v.Severity.toLowerCase() === severity.toLowerCase()).length || 0), 0);
  }

  // Toggle methods for details sections
  toggleOwaspDetails(): void {
    this.showOwaspDetails = !this.showOwaspDetails;
  }

  getVulnerabilityCount(severity: string): number {
    let count = 0;

    // Count Snyk vulnerabilities
    if (this.scanResults.snyk?.vulnerabilities) {
      count += this.scanResults.snyk.vulnerabilities.filter(
        (vuln) => vuln.severity.toLowerCase() === severity.toLowerCase()
      ).length;
    }

    // Count Trivy vulnerabilities
    if (this.scanResults.trivy?.length) {
      count += this.scanResults.trivy.filter(vuln => vuln.Vulnerabilities.some(v => v.Severity.toLowerCase() === severity.toLowerCase())).length;
    }

    // Count OWASP vulnerabilities
    if (this.scanResults.owasp?.vulnerabilities) {
      count += this.scanResults.owasp.vulnerabilities.filter(
        (vuln) => vuln.severity.toLowerCase() === severity.toLowerCase()
      ).length;
    }

    return count;
  }

  getSonarMetrics(): Array<{ name: string; value: number }> {
    const metrics = this.scanResults.sonar?.component.measures;
    if (!metrics) return [];

    return [
      { name: 'Bugs', value: this.getMetricValue('bugs') },
      { name: 'Code Smells', value: this.getMetricValue('code_smells') },
      { name: 'Coverage', value: this.getMetricValue('coverage') },
      { name: 'Duplications', value: this.getMetricValue('duplicated_lines_density') }
    ];
  }

  getSonarIssues(): Array<{ severity: string; message: string; component: string }> {
    return this.scanResults.sonar?.issues || [];
  }

  private initializeScanResults(): ScanResults {
    return {
      overallScore: 0,
      totalVulnerabilities: 6,
      criticalIssues: 2,
      codeQuality: 0,
      securityScore: 0,
      snyk: {
        status: '',
        ok: false,
        summary: 'Scan completed',
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
          name: '',
          key: '',
          qualifier: '',
          measures: []
        },
        issues: []
      },
      trivy: [
        {
          Target: 'package-lock.json',
          Vulnerabilities: [
            {
              VulnerabilityID: 'CVE-2019-10744',
              PkgName: 'lodash',
              InstalledVersion: '4.17.11',
              FixedVersion: '4.17.12',
              Severity: 'CRITICAL',
              Title: 'nodejs-lodash: prototype pollution in defaultsDeep function leading to modifying properties',
              Description: 'https://avd.aquasec.com/nvd/cve-2019-10744'
            },
            {
              VulnerabilityID: 'CVE-2020-8203',
              PkgName: 'lodash',
              InstalledVersion: '4.17.11',
              FixedVersion: '4.17.19',
              Severity: 'HIGH',
              Title: 'nodejs-lodash: prototype pollution in zipObjectDeep function',
              Description: 'https://avd.aquasec.com/nvd/cve-2020-8203'
            },
            {
              VulnerabilityID: 'CVE-2021-23337',
              PkgName: 'lodash',
              InstalledVersion: '4.17.11',
              FixedVersion: '4.17.21',
              Severity: 'HIGH',
              Title: 'nodejs-lodash: command injection via template',
              Description: 'https://avd.aquasec.com/nvd/cve-2021-23337'
            },
            {
              VulnerabilityID: 'CVE-2020-28500',
              PkgName: 'lodash',
              InstalledVersion: '4.17.11',
              FixedVersion: '4.17.21',
              Severity: 'MEDIUM',
              Title: 'nodejs-lodash: ReDoS via the toNumber, trim and trimEnd functions',
              Description: 'https://avd.aquasec.com/nvd/cve-2020-28500'
            }
          ]
        },
        {
          Target: 'game.js',
          Vulnerabilities: [
            {
              VulnerabilityID: 'SECRET-001',
              PkgName: 'Stripe Secret Key',
              InstalledVersion: 'N/A',
              FixedVersion: 'N/A',
              Severity: 'CRITICAL',
              Title: 'Stripe Secret Key found in game.js',
              Description: 'game.js:105'
            }
          ]
        },
        {
          Target: 'package-lock.json (license)',
          Vulnerabilities: [
            {
              VulnerabilityID: 'LICENSE-001',
              PkgName: 'lodash',
              InstalledVersion: '4.17.11',
              FixedVersion: 'N/A',
              Severity: 'LOW',
              Title: 'MIT License Notice',
              Description: 'License: MIT, Classification: Notice'
            }
          ]
        }
      ],
      owasp: {
        status: '',
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
  }
}
