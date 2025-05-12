import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FooterComponent } from './shared/footer/footer.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([]),
        CommonModule,
        FooterComponent
      ],
      declarations: [],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: {}, parent: {}, firstChild: null }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it(`should have title 'CheckSec'`, () => {
    expect(component.title).toEqual('CheckSec');
  });

  it('should render logo container with image', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logoContainer = compiled.querySelector('.logo-container');
    expect(logoContainer).toBeTruthy();
    const img = logoContainer?.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('assets/images/mob.png');
    expect(img?.getAttribute('alt')).toBe('Logo de la société');
  });

  it('should handle window scroll', () => {
    const logoContainer = fixture.nativeElement.querySelector('.logo-container');
    expect(logoContainer).toBeTruthy();

    // Simulate scroll > 50
    Object.defineProperty(window, 'scrollY', { value: 100 });
    component.onWindowScroll();
    expect(logoContainer.classList.contains('scrolled')).toBeTruthy();

    // Simulate scroll < 50
    Object.defineProperty(window, 'scrollY', { value: 0 });
    component.onWindowScroll();
    expect(logoContainer.classList.contains('scrolled')).toBeFalsy();
  });
});
