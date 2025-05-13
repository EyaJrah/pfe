import { TestBed } from '@angular/core/testing';
import { NavigationService } from './navigation.service';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('NavigationService', () => {
  let service: NavigationService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [NavigationService]
    });
    service = TestBed.inject(NavigationService);
    router = TestBed.inject(Router);
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('devrait naviguer vers le chemin spécifié', async () => {
    // Créer un spy pour la méthode navigate du Router
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    
    // Appeler la méthode du service
    await service.navigateAndReload('/test-path');
    
    // Vérifier que la méthode navigate a été appelée avec le bon chemin
    expect(navigateSpy).toHaveBeenCalledWith(['/test-path']);
  });
}); 