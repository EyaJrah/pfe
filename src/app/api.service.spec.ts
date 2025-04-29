import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => localStorageMock[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete localStorageMock[key];
        })
      },
      writable: true
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorageMock = {};
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('signup', () => {
    it('should send signup request with correct data', (done) => {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      service.signup(testData.name, testData.email, testData.password).subscribe({
        next: (response) => {
          expect(response).toEqual({ message: 'Signup successful' });
          done();
        },
        error: (error) => done(error)
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/signup`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(testData);
      req.flush({ message: 'Signup successful' });
    });

    it('should handle signup error', (done) => {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      service.signup(testData.name, testData.email, testData.password).subscribe({
        error: (error) => {
          expect(error.message).toBe('Erreur serveur. Veuillez réessayer plus tard.');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/signup`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('login', () => {
    it('should send login request and store token on success', (done) => {
      const testCredentials = { email: 'test@example.com', password: 'password123' };
      const mockResponse = { token: 'fake-token', user: { id: '1', name: 'Test User', email: 'test@example.com' } };
      
      service.login(testCredentials.email, testCredentials.password).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(window.localStorage.setItem).toHaveBeenCalledWith('auth_token', 'fake-token');
          done();
        },
        error: (error) => done(error)
      });
      
      const req = httpMock.expectOne(`${environment.apiUrl}/users/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(testCredentials);
      req.flush(mockResponse);
    });

    it('should handle login error', (done) => {
      const testCredentials = { email: 'test@example.com', password: 'wrong-password' };
      
      service.login(testCredentials.email, testCredentials.password).subscribe({
        error: (error) => {
          expect(error.message).toBe('Session expirée. Veuillez vous reconnecter.');
          done();
        }
      });
      
      const req = httpMock.expectOne(`${environment.apiUrl}/users/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(testCredentials);
      req.flush('Invalid credentials', { 
        status: 401, 
        statusText: 'Unauthorized'
      });
    });
  });

  describe('getProfile', () => {
    it('should get user profile when token exists', (done) => {
      const mockToken = 'fake-token';
      const mockProfile = { id: '1', name: 'Test User', email: 'test@example.com' };
      
      window.localStorage.getItem = jest.fn().mockReturnValue(mockToken);
      
      service.getProfile().subscribe({
        next: (profile) => {
          expect(profile).toEqual(mockProfile);
          done();
        },
        error: (error) => done(error)
      });
      
      const req = httpMock.expectOne(`${environment.apiUrl}/users/profile`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockProfile);
    });

    it('should return error when no token exists', (done) => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null);
      
      service.getProfile().subscribe({
        error: (error) => {
          expect(error.message).toBe('No authentication token found');
          done();
        }
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile when token exists', (done) => {
      const mockToken = 'fake-token';
      const updateData = { name: 'Updated User', email: 'updated@example.com' };
      const mockResponse = { ...updateData, id: '1' };
      
      window.localStorage.getItem = jest.fn().mockReturnValue(mockToken);
      
      service.updateProfile(updateData.name, updateData.email).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: (error) => done(error)
      });
      
      const req = httpMock.expectOne(`${environment.apiUrl}/users/profile`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      expect(req.request.body).toEqual(updateData);
      req.flush(mockResponse);
    });

    it('should return error when no token exists', (done) => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null);
      
      service.updateProfile('Test User', 'test@example.com').subscribe({
        error: (error) => {
          expect(error.message).toBe('No authentication token found');
          done();
        }
      });
    });
  });

  describe('scanWithSonarQube', () => {
    it('should send scan request with auth token', (done) => {
      const mockToken = 'fake-token';
      const repoUrl = 'https://github.com/test/repo';
      const mockResponse = { status: 'success' };

      window.localStorage.getItem = jest.fn().mockReturnValue(mockToken);

      service.scanWithSonarQube(repoUrl).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: (error) => done(error)
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/scan-results/sonar`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ repoUrl });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockResponse);
    });

    it('should return error if no token is present', (done) => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null);
      
      service.scanWithSonarQube('https://github.com/test/repo').subscribe({
        error: (error) => {
          expect(error.message).toBe('No authentication token found');
          done();
        }
      });
    });
  });

  describe('scanWithTrivy', () => {
    it('should send scan request with auth token', (done) => {
      const mockToken = 'fake-token';
      const repoUrl = 'https://github.com/test/repo';
      const mockResponse = { status: 'success' };

      window.localStorage.getItem = jest.fn().mockReturnValue(mockToken);

      service.scanWithTrivy(repoUrl).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: (error) => done(error)
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/scan-results/trivy`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ repoUrl });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockResponse);
    });

    it('should return error if no token is present', (done) => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null);
      
      service.scanWithTrivy('https://github.com/test/repo').subscribe({
        error: (error) => {
          expect(error.message).toBe('No authentication token found');
          done();
        }
      });
    });
  });

  describe('scanWithSnyk', () => {
    it('should send scan request with auth token', (done) => {
      const mockToken = 'fake-token';
      const repoUrl = 'https://github.com/test/repo';
      const mockResponse = { status: 'success' };

      window.localStorage.getItem = jest.fn().mockReturnValue(mockToken);

      service.scanWithSnyk(repoUrl).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: (error) => done(error)
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/scan-results/snyk`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ repoUrl });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockResponse);
    });

    it('should return error if no token is present', (done) => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null);
      
      service.scanWithSnyk('https://github.com/test/repo').subscribe({
        error: (error) => {
          expect(error.message).toBe('No authentication token found');
          done();
        }
      });
    });
  });

  describe('scanWithOWASP', () => {
    it('should send scan request with auth token', (done) => {
      const mockToken = 'fake-token';
      const repoUrl = 'https://github.com/test/repo';
      const mockResponse = { status: 'success' };

      window.localStorage.getItem = jest.fn().mockReturnValue(mockToken);

      service.scanWithOWASP(repoUrl).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: (error) => done(error)
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/scan-results/owasp`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ repoUrl });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockResponse);
    });

    it('should return error if no token is present', (done) => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null);
      
      service.scanWithOWASP('https://github.com/test/repo').subscribe({
        error: (error) => {
          expect(error.message).toBe('No authentication token found');
          done();
        }
      });
    });
  });

  describe('getScanResults', () => {
    it('should get scan results with repoUrl when token exists', (done) => {
      const mockToken = 'fake-token';
      const repoUrl = 'https://github.com/test/repo';
      const mockResponse = { results: [] };

      window.localStorage.getItem = jest.fn().mockReturnValue(mockToken);

      service.getScanResults(repoUrl).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: (error) => done(error)
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/scan-results?repoUrl=${encodeURIComponent(repoUrl)}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockResponse);
    });

    it('should get all scan results when token exists and no repoUrl provided', (done) => {
      const mockToken = 'fake-token';
      const mockResponse = { results: [] };

      window.localStorage.getItem = jest.fn().mockReturnValue(mockToken);

      service.getScanResults().subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: (error) => done(error)
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/scan-results`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockResponse);
    });

    it('should return error when no token exists', (done) => {
      window.localStorage.getItem = jest.fn().mockReturnValue(null);
      
      service.getScanResults().subscribe({
        error: (error) => {
          expect(error.message).toBe('No authentication token found');
          done();
        }
      });
    });
  });

  describe('logout', () => {
    it('should remove token from localStorage', () => {
      service.logout();
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});
