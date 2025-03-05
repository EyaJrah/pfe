import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // ✅ Add ReactiveFormsModule here
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router, private apiService: ApiService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async submitLogin() {
    if (this.loginForm.invalid) {
      alert("Please enter a valid email and password.");
      return;
    }

    const { email, password } = this.loginForm.value;
    console.log('🔹 Submit Login:', { email, password });

    try {
      const response = await this.apiService.login(email, password).toPromise();
      console.log('🔹 Response:', response);

      if (response?.token) {
        localStorage.setItem('token', response.token);
        this.router.navigate(['/dashbord']);
      } else {
        alert('Invalid credentials or server error.');
      }
    } catch (error: any) {
      console.error('❌ Login Error:', error);
      alert(error.status === 401 ? 'Invalid email or password.' : 'An error occurred. Try again later.');
    }
  }

  goToSignUp() {
    this.router.navigate(['/signup']);
  }
}
