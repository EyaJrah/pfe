import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface SignupResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  standalone: true,
  imports: [FormsModule, HttpClientModule, CommonModule],
})
export class SignUpComponent {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private router: Router, private http: HttpClient) {}

  submitSignUp() {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas!';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const userData = {
      name: `${this.firstName} ${this.lastName}`,
      email: this.email,
      password: this.password,
    };

    this.http.post<SignupResponse>('http://localhost:5000/api/auth/signup', userData)
      .subscribe({
        next: (response: SignupResponse) => {
          console.log('Utilisateur enregistré:', response);
          this.isLoading = false;
          this.router.navigate(['/dashbord']);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erreur lors de l\'inscription:', error);
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Erreur lors de l\'inscription. Veuillez réessayer.';
        }
      });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}