import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { NavigationService } from '../../services/navigation.service';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let navigationService: jest.Mocked<NavigationService>;

  beforeEach(async () => {
    navigationService = {
      navigateAndReload: jest.fn().mockResolvedValue(true)
    } as any;

    await TestBed.configureTestingModule({
      imports: [
        FooterComponent,
        RouterTestingModule.withRoutes([])
      ],
      providers: [
        { provide: NavigationService, useValue: navigationService },
        { provide: ActivatedRoute, useValue: { snapshot: {}, parent: {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call navigation service when refreshPage is called', () => {
    component.refreshPage();
    expect(navigationService.navigateAndReload).toHaveBeenCalled();
  });
});
