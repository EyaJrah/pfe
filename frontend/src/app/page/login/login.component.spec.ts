import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { ApiService } from '../../api.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let apiService: jest.Mocked<ApiService>;
  let router: jest.Mocked<Router>;
  let formBuilder: FormBuilder;
  let originalConsoleError: typeof console.error;

  const testCredentials = {
    email: 'test@example.com',
    password: 'password123'
  };

  beforeEach(async () => {
    // Sauvegarder la fonction console.error originale
    originalConsoleError = console.error;
    // Remplacer console.error par un mock
    console.error = jest.fn();

    apiService = {
      login: jest.fn()
    } as any;

    router = {
      navigate: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: Router, useValue: router },
        FormBuilder
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    formBuilder = TestBed.inject(FormBuilder);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Restaurer la fonction console.error originale
    console.error = originalConsoleError;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should show error message for invalid email', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('invalid-email');
    emailControl?.markAsTouched();
    fixture.detectChanges();
    
    expect(emailControl?.errors?.['email']).toBeTruthy();
  });

  it('should show error message for short password', () => {
    const passwordControl = component.loginForm.get('password');
    passwordControl?.setValue('123');
    passwordControl?.markAsTouched();
    fixture.detectChanges();
    
    expect(passwordControl?.errors?.['minlength']).toBeTruthy();
  });

  it('should call login service with correct credentials', () => {
    apiService.login.mockReturnValue(of({ token: 'fake-token' }));
    router.navigate.mockResolvedValue(true);

    component.loginForm = formBuilder.group({
      email: [testCredentials.email],
      password: [testCredentials.password]
    });

    component.submitLogin();

    expect(apiService.login).toHaveBeenCalledWith(testCredentials.email, testCredentials.password);
  });

  it('should handle login error', () => {
    const error = new HttpErrorResponse({ error: 'Login failed' });
    apiService.login.mockReturnValue(throwError(() => error));
    router.navigate.mockResolvedValue(true);

    component.loginForm = formBuilder.group({
      email: [testCredentials.email],
      password: [testCredentials.password]
    });

    component.submitLogin();

    expect(apiService.login).toHaveBeenCalledWith(testCredentials.email, testCredentials.password);
    expect(console.error).toHaveBeenCalledWith('Login error:', error);
  });
});
