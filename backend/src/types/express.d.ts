import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string;
        role: string;
        email: string;
        name: string;
      };
      tenant?: {
        id: string;
        nombre: string;
        nit: string;
        subdomain: string;
        plan: string;
      };
    }
  }
}

export {};
