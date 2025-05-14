import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

interface LoginResponse {
  token: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private fb: FormBuilder, private router: Router, private apiService: ApiService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  submitLogin() {
    this.errorMessage = '';
    
    if (this.loginForm.invalid) {
      if (this.loginForm.get('email')?.errors?.['required']) {
        this.errorMessage = 'Email is required';
      } else if (this.loginForm.get('email')?.errors?.['email']) {
        this.errorMessage = 'Please enter a valid email';
      } else if (this.loginForm.get('password')?.errors?.['required']) {
        this.errorMessage = 'Password is required';
      } else if (this.loginForm.get('password')?.errors?.['minlength']) {
        this.errorMessage = 'Password must be at least 6 characters';
      }
      return;
    }

    const { email, password } = this.loginForm.value;
    console.log('Attempting login with:', { email });
    
    this.isLoading = true;

    this.apiService.login(email, password).subscribe({
      next: (response: LoginResponse) => {
        console.log('Login successful, response:', response);

        if (response?.token) {
          // Store the token securely
          localStorage.setItem('auth_token', response.token);
          console.log('Token stored in localStorage');
          
          // Store user info if available
          if (response.user) {
            localStorage.setItem('user_info', JSON.stringify(response.user));
            console.log('User info stored in localStorage');
          }

          // Navigate to dashboard
          console.log('Navigating to dashboard...');
          this.router.navigate(['/dashbord']).then(
            success => console.log('Navigation successful:', success),
            error => console.error('Navigation failed:', error)
          );
        } else {
          console.error('No token in response');
          this.errorMessage = 'Invalid response from server';
        }
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Login error:', error);
        this.isLoading = false;
        
        if (error.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (error.status === 400) {
          this.errorMessage = 'Invalid email or password';
        } else if (error.status === 401) {
          this.errorMessage = 'Invalid credentials';
        } else if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'An error occurred. Please try again later.';
        }
      }
    });
  }

  goToSignUp() {
    this.router.navigate(['/sign-up']);
  }
}
