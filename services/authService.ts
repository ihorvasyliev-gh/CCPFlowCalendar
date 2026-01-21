import { User, UserRole } from '../types';

// Mock users for demonstration
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@ccp.com',
    fullName: 'CCP Administrator',
    role: UserRole.ADMIN
  },
  {
    id: '2',
    email: 'staff@ccp.com',
    fullName: 'Jane Doe',
    role: UserRole.STAFF
  }
];

export const login = async (email: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = MOCK_USERS.find(u => u.email === email);
      if (user) {
        resolve(user);
      } else {
        reject(new Error('Invalid credentials. Try admin@ccp.com or staff@ccp.com'));
      }
    }, 800);
  });
};

export const logout = async (): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 500));
};
