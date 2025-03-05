import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // Import HttpClient

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  standalone: true,
  imports: [FormsModule],
})
export class SignUpComponent {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  constructor(private router: Router, private http: HttpClient) {} // Inject HttpClient


  submitSignUp() {
    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    const userData = {
      name: `${this.firstName} ${this.lastName}`,
      email: this.email,
      password: this.password,
    };

    this.http.post('http://localhost:5000/api/auth/signup', userData)
      .subscribe(
        (response) => {
          console.log('User registered:', response);
          this.router.navigate(['/dashboard']);
        },
        (error) => {
          console.error('Error during sign up:', error);
          alert('Error during sign-up. Please try again.');
        }
      );
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}