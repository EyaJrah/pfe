import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SecurityScanService, ScanResult } from '../../services/security-scan.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-scan-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './scan-results.component.html',
  styleUrls: ['./scan-results.component.css']
})
export class ScanResultsComponent implements OnInit {
  repositoryUrl: string = '';
  scanResults: ScanResult[] = [];
  isLoading: boolean = true;
  selectedTool: string = 'all';
  selectedSeverity: string = 'all';
  filteredResults: ScanResult[] = [];
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private securityScanService: SecurityScanService
  ) {}

  ngOnInit() {
    console.log('ScanResultsComponent initialized');
    this.route.queryParams.subscribe(params => {
      this.repositoryUrl = params['repo'] || '';
      console.log('Repository URL from params:', this.repositoryUrl);
      if (this.repositoryUrl) {
        this.loadScanResults();
      } else {
        this.errorMessage = 'No repository URL provided';
        this.isLoading = false;
      }
    });
  }

  loadScanResults() {
    console.log('Loading scan results for:', this.repositoryUrl);
    this.isLoading = true;
    this.errorMessage = '';
    
    // Utiliser le service pour obtenir les résultats
    this.securityScanService.analyzeRepository(this.repositoryUrl).subscribe(
      results => {
        console.log('Scan results received:', results);
        this.scanResults = results;
        this.filterResults();
        this.isLoading = false;
      },
      error => {
        console.error('Error loading scan results:', error);
        this.errorMessage = 'Failed to load scan results. Please try again later.';
        // En cas d'erreur, utiliser des données de démonstration
        this.loadDemoResults();
      }
    );
  }

  // Méthode pour charger des données de démonstration en cas d'erreur
  private loadDemoResults() {
    console.log('Loading demo results');
    setTimeout(() => {
      this.scanResults = [
        {
          tool: 'SonarQube',
          severity: 'High',
          description: 'SQL Injection vulnerability detected',
          location: 'src/database/query.js:45',
          recommendation: 'Use parameterized queries to prevent SQL injection'
        },
        {
          tool: 'Trivy',
          severity: 'Medium',
          description: 'Outdated package version',
          location: 'package.json',
          recommendation: 'Update to latest version'
        },
        {
          tool: 'Snyk',
          severity: 'Low',
          description: 'Known vulnerability in dependency',
          location: 'node_modules/package-name',
          recommendation: 'Update dependency to patched version'
        },
        {
          tool: 'OWASP Dependency Check',
          severity: 'Info',
          description: 'New version available',
          location: 'pom.xml',
          recommendation: 'Consider updating to latest version'
        }
      ];
      this.filterResults();
      this.isLoading = false;
    }, 1500);
  }

  // Filtrer les résultats en fonction des sélections
  filterResults() {
    console.log('Filtering results. Tool:', this.selectedTool, 'Severity:', this.selectedSeverity);
    this.filteredResults = this.scanResults.filter(result => {
      const toolMatch = this.selectedTool === 'all' || result.tool.toLowerCase() === this.selectedTool.toLowerCase();
      const severityMatch = this.selectedSeverity === 'all' || result.severity.toLowerCase() === this.selectedSeverity.toLowerCase();
      return toolMatch && severityMatch;
    });
    console.log('Filtered results count:', this.filteredResults.length);
  }

  // Gérer le changement de filtre d'outil
  onToolChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedTool = select.value;
    console.log('Tool filter changed to:', this.selectedTool);
    this.filterResults();
  }

  // Gérer le changement de filtre de sévérité
  onSeverityChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedSeverity = select.value;
    console.log('Severity filter changed to:', this.selectedSeverity);
    this.filterResults();
  }

  goBack() {
    console.log('Navigating back to dashboard');
    this.router.navigate(['/dashbord']);
  }

  logout() {
    // Supprimer le token d'authentification
    localStorage.removeItem('token');
    // Rediriger vers la page de connexion
    this.router.navigate(['/login']);
  }
} 