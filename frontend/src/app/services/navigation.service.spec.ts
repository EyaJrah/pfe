import { TestBed } from '@angular/core/testing';
import { NavigationService } from './navigation.service';
import { Router } from '@angular/router';

describe('NavigationService', () => {
  let service: NavigationService;
  let router: jest.Mocked<Router>;

  beforeEach(() => {
    router = {
      navigate: jest.fn().mockResolvedValue(true)
    } as any;

    TestBed.configureTestingModule({
      providers: [
        NavigationService,
        { provide: Router, useValue: router }
      ]
    });

    service = TestBed.inject(NavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('navigateAndReload', () => {
    it('should navigate to the specified path', async () => {
      const path = '/dashboard';
      
      await service.navigateAndReload(path);
      
      expect(router.navigate).toHaveBeenCalledWith([path]);
    });
  });
}); 