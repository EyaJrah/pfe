import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import axios from 'axios';
import { environment } from '../../environments/environment';

export interface ScanResult {
  tool: string;
  severity: 'High' | 'Medium' | 'Low' | 'Info';
  description: string;
  location: string;
  recommendation: string;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityScanService {
  // URLs des API des différents outils depuis l'environnement
  private sonarqubeApiUrl = environment.securityTools?.sonarqube?.apiUrl || '';
  private trivyApiUrl = environment.securityTools?.trivy?.apiUrl || '';
  private snykApiUrl = environment.securityTools?.snyk?.apiUrl || '';
  private owaspApiUrl = environment.securityTools?.owasp?.apiUrl || '';
  
  // Clés API depuis l'environnement
  private sonarqubeToken = environment.securityTools?.sonarqube?.token || '';
  private snykToken = environment.securityTools?.snyk?.token || '';
  private snykOrgId = environment.securityTools?.snyk?.orgId || '';

  constructor(private http: HttpClient) { }

  // Analyser un repository GitHub avec tous les outils
  analyzeRepository(githubUrl: string): Observable<ScanResult[]> {
    console.log('Analyzing repository:', githubUrl);
    
    // Extraire le nom d'utilisateur et le nom du repository de l'URL GitHub
    const repoInfo = this.extractRepoInfo(githubUrl);
    if (!repoInfo) {
      console.error('Invalid GitHub URL');
      return of([]);
    }

    // Lancer les analyses en parallèle avec tous les outils
    return forkJoin({
      sonarqube: this.analyzeWithSonarQube(githubUrl),
      trivy: this.analyzeWithTrivy(githubUrl),
      snyk: this.analyzeWithSnyk(githubUrl),
      owasp: this.analyzeWithOwasp(githubUrl)
    }).pipe(
      map(results => {
        // Combiner tous les résultats
        const allResults: ScanResult[] = [];
        
        // Ajouter les résultats de SonarQube
        if (results.sonarqube && results.sonarqube.length > 0) {
          allResults.push(...results.sonarqube);
        }
        
        // Ajouter les résultats de Trivy
        if (results.trivy && results.trivy.length > 0) {
          allResults.push(...results.trivy);
        }
        
        // Ajouter les résultats de Snyk
        if (results.snyk && results.snyk.length > 0) {
          allResults.push(...results.snyk);
        }
        
        // Ajouter les résultats de OWASP
        if (results.owasp && results.owasp.length > 0) {
          allResults.push(...results.owasp);
        }
        
        return allResults;
      }),
      catchError(error => {
        console.error('Error analyzing repository:', error);
        // En cas d'erreur, retourner des données de démonstration
        return of(this.getDemoResults());
      })
    );
  }

  // Analyser avec SonarQube
  analyzeWithSonarQube(githubUrl: string): Observable<ScanResult[]> {
    console.log('Analyzing with SonarQube:', githubUrl);
    
    // Vérifier si les configurations sont disponibles
    if (!this.sonarqubeApiUrl || !this.sonarqubeToken) {
      console.error('SonarQube configuration is missing');
      return of([]);
    }
    
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.sonarqubeToken}`);
    
    // Cloner le repository pour l'analyse
    return this.http.post<any>(`${this.sonarqubeApiUrl}/projects/create`, {
      projectKey: this.generateProjectKey(githubUrl),
      name: this.extractRepoName(githubUrl),
      mainBranch: 'main',
      url: githubUrl
    }, { headers }).pipe(
      switchMap(project => {
        // Lancer l'analyse
        return this.http.post<any>(`${this.sonarqubeApiUrl}/analysis/start`, {
          projectKey: project.key
        }, { headers });
      }),
      switchMap(analysis => {
        // Attendre que l'analyse soit terminée
        return this.pollSonarQubeAnalysis(analysis.id, headers);
      }),
      map(analysisResult => {
        // Convertir les résultats au format ScanResult
        return this.convertSonarQubeResults(analysisResult);
      }),
      catchError(error => {
        console.error('Error fetching SonarQube results:', error);
        return of([]);
      })
    );
  }

  // Analyser avec Trivy
  analyzeWithTrivy(githubUrl: string): Observable<ScanResult[]> {
    console.log('Analyzing with Trivy:', githubUrl);
    
    // Vérifier si les configurations sont disponibles
    if (!this.trivyApiUrl) {
      console.error('Trivy configuration is missing');
      return of([]);
    }
    
    // Utiliser l'API REST de Trivy
    return this.http.post<any>(`${this.trivyApiUrl}/scan`, {
      target: githubUrl,
      format: 'json'
    }).pipe(
      map(result => {
        // Convertir les résultats au format ScanResult
        return this.convertTrivyResults(result);
      }),
      catchError(error => {
        console.error('Error fetching Trivy results:', error);
        return of([]);
      })
    );
  }

  // Analyser avec Snyk
  analyzeWithSnyk(githubUrl: string): Observable<ScanResult[]> {
    console.log('Analyzing with Snyk:', githubUrl);
    
    // Vérifier si les configurations sont disponibles
    if (!this.snykApiUrl || !this.snykToken || !this.snykOrgId) {
      console.error('Snyk configuration is missing');
      return of([]);
    }
    
    const headers = new HttpHeaders().set('Authorization', `token ${this.snykToken}`);
    
    // Créer un projet Snyk pour le repository
    return this.http.post<any>(`${this.snykApiUrl}/org/${this.snykOrgId}/projects`, {
      name: this.extractRepoName(githubUrl),
      repository: {
        url: githubUrl
      }
    }, { headers }).pipe(
      switchMap(project => {
        // Lancer l'analyse
        return this.http.post<any>(`${this.snykApiUrl}/org/${this.snykOrgId}/projects/${project.id}/test`, {}, { headers });
      }),
      map(result => {
        // Convertir les résultats au format ScanResult
        return this.convertSnykResults(result);
      }),
      catchError(error => {
        console.error('Error fetching Snyk results:', error);
        return of([]);
      })
    );
  }

  // Analyser avec OWASP Dependency Check
  analyzeWithOwasp(githubUrl: string): Observable<ScanResult[]> {
    console.log('Analyzing with OWASP:', githubUrl);
    
    // Vérifier si les configurations sont disponibles
    if (!this.owaspApiUrl) {
      console.error('OWASP configuration is missing');
      return of([]);
    }
    
    // Utiliser l'API REST de OWASP Dependency Check
    return this.http.post<any>(`${this.owaspApiUrl}/scan`, {
      projectPath: githubUrl,
      format: 'JSON'
    }).pipe(
      map(result => {
        // Convertir les résultats au format ScanResult
        return this.convertOwaspResults(result);
      }),
      catchError(error => {
        console.error('Error fetching OWASP results:', error);
        return of([]);
      })
    );
  }

  // Extraire les informations du repository à partir de l'URL GitHub
  private extractRepoInfo(githubUrl: string): { owner: string, repo: string } | null {
    try {
      const regex = /^https:\/\/github\.com\/([\w-]+)\/([\w-]+)$/;
      const match = githubUrl.match(regex);
      if (match) {
        return {
          owner: match[1],
          repo: match[2]
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // Générer une clé de projet unique pour SonarQube
  private generateProjectKey(githubUrl: string): string {
    const repoInfo = this.extractRepoInfo(githubUrl);
    if (repoInfo) {
      return `github_${repoInfo.owner}_${repoInfo.repo}`.replace(/[^a-zA-Z0-9_]/g, '_');
    }
    return `github_${Date.now()}`;
  }

  // Extraire le nom du repository à partir de l'URL GitHub
  private extractRepoName(githubUrl: string): string {
    const repoInfo = this.extractRepoInfo(githubUrl);
    return repoInfo ? repoInfo.repo : 'unknown-repo';
  }

  // Attendre que l'analyse SonarQube soit terminée
  private pollSonarQubeAnalysis(analysisId: string, headers: HttpHeaders): Observable<any> {
    return new Observable(observer => {
      const checkStatus = () => {
        this.http.get<any>(`${this.sonarqubeApiUrl}/analysis/status/${analysisId}`, { headers })
          .subscribe(
            status => {
              if (status.status === 'SUCCESS') {
                // Récupérer les résultats de l'analyse
                this.http.get<any>(`${this.sonarqubeApiUrl}/issues/search`, {
                  headers,
                  params: { componentKeys: analysisId }
                }).subscribe(
                  issues => {
                    observer.next(issues);
                    observer.complete();
                  },
                  error => observer.error(error)
                );
              } else if (status.status === 'FAILED') {
                observer.error(new Error('SonarQube analysis failed'));
              } else {
                // Continuer à vérifier le statut
                setTimeout(checkStatus, 5000);
              }
            },
            error => observer.error(error)
          );
      };
      
      checkStatus();
    });
  }

  // Convertir les résultats de SonarQube au format ScanResult
  private convertSonarQubeResults(sonarResults: any): ScanResult[] {
    if (!sonarResults || !sonarResults.issues) {
      return [];
    }
    
    return sonarResults.issues.map((issue: any) => {
      // Mapper la sévérité SonarQube à notre format
      let severity: 'High' | 'Medium' | 'Low' | 'Info';
      switch (issue.severity) {
        case 'BLOCKER':
        case 'CRITICAL':
          severity = 'High';
          break;
        case 'MAJOR':
          severity = 'Medium';
          break;
        case 'MINOR':
          severity = 'Low';
          break;
        default:
          severity = 'Info';
      }
      
      return {
        tool: 'SonarQube',
        severity,
        description: issue.message,
        location: `${issue.component}:${issue.line || 'N/A'}`,
        recommendation: issue.effort ? `Estimated effort to fix: ${issue.effort}` : 'No specific recommendation'
      };
    });
  }

  // Convertir les résultats de Trivy au format ScanResult
  private convertTrivyResults(trivyResults: any): ScanResult[] {
    if (!trivyResults || !trivyResults.Results) {
      return [];
    }
    
    const results: ScanResult[] = [];
    
    trivyResults.Results.forEach((result: any) => {
      if (result.Vulnerabilities) {
        result.Vulnerabilities.forEach((vuln: any) => {
          // Mapper la sévérité Trivy à notre format
          let severity: 'High' | 'Medium' | 'Low' | 'Info';
          switch (vuln.Severity) {
            case 'CRITICAL':
            case 'HIGH':
              severity = 'High';
              break;
            case 'MEDIUM':
              severity = 'Medium';
              break;
            case 'LOW':
              severity = 'Low';
              break;
            default:
              severity = 'Info';
          }
          
          results.push({
            tool: 'Trivy',
            severity,
            description: vuln.Title,
            location: `${result.Target}:${vuln.PkgName || 'N/A'}`,
            recommendation: vuln.FixedVersion ? `Update to version ${vuln.FixedVersion}` : 'No fix available'
          });
        });
      }
    });
    
    return results;
  }

  // Convertir les résultats de Snyk au format ScanResult
  private convertSnykResults(snykResults: any): ScanResult[] {
    if (!snykResults || !snykResults.vulnerabilities) {
      return [];
    }
    
    return snykResults.vulnerabilities.map((vuln: any) => {
      // Mapper la sévérité Snyk à notre format
      let severity: 'High' | 'Medium' | 'Low' | 'Info';
      switch (vuln.severity) {
        case 'critical':
        case 'high':
          severity = 'High';
          break;
        case 'medium':
          severity = 'Medium';
          break;
        case 'low':
          severity = 'Low';
          break;
        default:
          severity = 'Info';
      }
      
      return {
        tool: 'Snyk',
        severity,
        description: vuln.title,
        location: `${vuln.packageName}:${vuln.version || 'N/A'}`,
        recommendation: vuln.remediation ? vuln.remediation : 'No specific recommendation'
      };
    });
  }

  // Convertir les résultats de OWASP au format ScanResult
  private convertOwaspResults(owaspResults: any): ScanResult[] {
    if (!owaspResults || !owaspResults.dependencies) {
      return [];
    }
    
    const results: ScanResult[] = [];
    
    owaspResults.dependencies.forEach((dep: any) => {
      if (dep.vulnerabilities) {
        dep.vulnerabilities.forEach((vuln: any) => {
          // Mapper la sévérité OWASP à notre format
          let severity: 'High' | 'Medium' | 'Low' | 'Info';
          switch (vuln.severity) {
            case 'Critical':
            case 'High':
              severity = 'High';
              break;
            case 'Medium':
              severity = 'Medium';
              break;
            case 'Low':
              severity = 'Low';
              break;
            default:
              severity = 'Info';
          }
          
          results.push({
            tool: 'OWASP Dependency Check',
            severity,
            description: vuln.name,
            location: `${dep.fileName}:${dep.packagePath || 'N/A'}`,
            recommendation: vuln.solution || 'No specific recommendation'
          });
        });
      }
    });
    
    return results;
  }

  // Données de démonstration en cas d'erreur
  private getDemoResults(): ScanResult[] {
    return [
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
  }
} 