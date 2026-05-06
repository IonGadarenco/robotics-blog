// src/types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'USER' | 'AUTHOR' | 'ADMIN';
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'AUTHOR' | 'ADMIN';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'USER' | 'AUTHOR' | 'ADMIN';
  }
}
