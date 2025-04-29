import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { RouterTestingModule } from '@angular/router/testing';
import { NavigationService } from '../../services/navigation.service';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let navigationService: jest.Mocked<NavigationService>;

  beforeEach(async () => {
    // Créer un mock du service de navigation
    navigationService = {
      navigateAndReload: jest.fn().mockResolvedValue(true)
    } as any;

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        FooterComponent
      ],
      providers: [
        { provide: NavigationService, useValue: navigationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait appeler le service de navigation lors de l\'appel à refreshPage', () => {
    // Appeler la méthode du composant
    component.refreshPage();
    
    // Vérifier que le service a été appelé avec le bon chemin
    expect(navigationService.navigateAndReload).toHaveBeenCalledWith('/dashbord');
  });
}); 