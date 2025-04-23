import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../api.service';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface UserProfile {
  name: string;
  email: string;
  // Ajoutez d'autres propriétés si nécessaire
}

interface ApiError {
  status: number;
  message: string;
  // Ajoutez d'autres propriétés si nécessaire
}

@Component({
  selector: 'app-dashbord',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashbordComponent implements OnInit {
  githubUrl: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  userInfo: UserProfile | null = null;
  isAuthenticated: boolean = false;
  scanCount: number = 0;

  constructor(
    private router: Router,
    private apiService: ApiService,
  ) { }

  ngOnInit() {
    console.log('Dashboard component initialized');
    
    // Vérifier si l'utilisateur est authentifié
    const token = localStorage.getItem('auth_token');
    console.log('Token from localStorage:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      console.log('No token found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    console.log('Fetching user profile...');
    
    // Récupérer les informations de l'utilisateur
    this.apiService.getProfile().subscribe({
      next: (response: UserProfile) => {
        console.log('User profile fetched successfully:', response);
        this.userInfo = response;
        this.isAuthenticated = true;
        this.isLoading = false;
        
       
      },
      error: (error: ApiError) => {
        console.error('Error fetching user profile:', error);
        this.errorMessage = 'Error loading user profile. Please try again.';
        this.isLoading = false;
        
        if (error.status === 401) {
          console.log('Token invalid or expired, redirecting to login');
          localStorage.removeItem('auth_token');
          this.router.navigate(['/login']);
        }
      }
    });
  }



  refreshPage() {
    window.location.reload();
  }

  startScan() {
    console.log('Starting scan for URL:', this.githubUrl);
    this.errorMessage = '';
    this.isLoading = true;
    
    if (this.githubUrl && this.isValidGithubUrl(this.githubUrl)) {
      console.log('URL is valid, extracting project key');
      
      // Extraire le projectKey de l'URL GitHub (format: username/repository)
      const projectKey = this.extractProjectKey(this.githubUrl);
      console.log('Extracted project key:', projectKey);
      
      console.log('Navigating to scan results with repo:', this.githubUrl, 'and projectKey:', projectKey);
      this.router.navigate(['/scan-results'], {
        queryParams: { 
          repo: this.githubUrl,
          projectKey: projectKey
        }
      });
    } else {
      console.log('Invalid URL');
      this.errorMessage = 'Please enter a valid GitHub repository URL (e.g., https://github.com/username/repository)';
      this.isLoading = false;
    }
  }

  private extractProjectKey(url: string): string {
    try {
      // Format attendu: https://github.com/username/repository
      const parts = url.split('/');
      if (parts.length >= 5) {
        const username = parts[3];
        const repository = parts[4];
        return `${username}_${repository}`;
      }
      return '';
    } catch (error) {
      console.error('Error extracting project key:', error);
      return '';
    }
  }

  private isValidGithubUrl(url: string): boolean {
    try {
      console.log('Validating GitHub URL:', url);
      const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/;
      const isValid = githubRegex.test(url);
      console.log('URL validation result:', isValid);
      return isValid;
    } catch (error) {
      console.error('Error validating URL:', error);
      return false;
    }
  }

  logout() {
    console.log('Logging out...');
    this.apiService.logout();
    this.router.navigate(['/login']);
  }
}
