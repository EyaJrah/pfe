import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-dashbord',
  imports: [CommonModule, ReactiveFormsModule], // ✅ Add ReactiveFormsModule here
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashbordComponent {
  constructor(private router: Router) { }

  logout() {
    // Here, you can clear any authentication data if you have, like a token or session
    // localStorage.removeItem('userToken');

    // Then redirect to the login page
    this.router.navigate(['/login']);

}
}
