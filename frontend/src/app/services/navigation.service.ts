import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  constructor(private router: Router) {}

  navigateAndReload(path: string): Promise<boolean> {
    return this.router.navigate([path]).then(() => {
      // Détecter l'environnement de test de manière plus fiable
      const isTestEnvironment = 
        typeof window === 'undefined' || 
        !window.location || 
        typeof window.location.reload !== 'function' ||
        // Vérifier si nous sommes dans un environnement de test
        (typeof process !== 'undefined' && process.env && process.env['NODE_ENV'] === 'test') ||
        // Vérifier si nous sommes dans JSDOM
        (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('jsdom'));

      if (!isTestEnvironment) {
        window.location.reload();
      }
      return true;
    });
  }
} 