import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {
  constructor(private router: Router) {}

  logout() {
    // Supprimer le token d'authentification
    localStorage.removeItem('token');
    // Rediriger vers la page de connexion
    this.router.navigate(['/login']);
  }
} 