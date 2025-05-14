import { User } from './user';

describe('User', () => {
  it('should create an instance with required fields', () => {
    const user = new User('123', 'test@example.com');
    expect(user).toBeTruthy();
    expect(user.uid).toBe('123');
    expect(user.email).toBe('test@example.com');
  });

  it('should create an instance with all fields', () => {
    const user = new User(
      '123',
      'test@example.com',
      'Test User',
      'https://example.com/photo.jpg',
      true
    );
    expect(user).toBeTruthy();
    expect(user.uid).toBe('123');
    expect(user.email).toBe('test@example.com');
    expect(user.displayName).toBe('Test User');
    expect(user.photoURL).toBe('https://example.com/photo.jpg');
    expect(user.emailVerified).toBe(true);
  });
}); 