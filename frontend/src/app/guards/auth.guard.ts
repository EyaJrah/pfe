import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('auth_token');
    if (token) {
      return true;
    }

    // Si pas de token, rediriger vers la page de login
    this.router.navigate(['/login']);
    return false;
  }
} 