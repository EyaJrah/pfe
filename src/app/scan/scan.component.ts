import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

interface ScanResponse {
  // Define the structure of your scan response here
  [key: string]: any;
}

@Component({
  selector: 'app-scan',
  templateUrl: './scan.component.html',
  styleUrls: ['./scan.component.css']
})
export class ScanComponent implements OnInit {
  githubUrl: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  scanResults: ScanResponse | null = null;

  constructor(private router: Router, private apiService: ApiService) {}

  ngOnInit(): void {}

  scanRepository() {
    if (!this.githubUrl) {
      this.errorMessage = 'Please enter a GitHub repository URL';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.scanResults = null;

    this.apiService.post('/scan-results/scan-all', { githubUrl: this.githubUrl })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response: ScanResponse) => {
          console.log('Scan response:', response);
          this.scanResults = response;
          this.errorMessage = '';
        },
        error: (error: HttpErrorResponse) => {
          console.error('Scan error:', error);
          if (error.status === 401) {
            this.errorMessage = 'Your session has expired. Please login again.';
            this.router.navigate(['/login']);
          } else if (error.status === 0) {
            this.errorMessage = 'Cannot connect to the server. Please check your connection and try again.';
          } else if (error.error && error.error.error) {
            this.errorMessage = error.error.error;
          } else {
            this.errorMessage = 'An error occurred during the scan. Please try again later.';
          }
        }
      });
  }
} 