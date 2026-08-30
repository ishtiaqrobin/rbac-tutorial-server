export interface IJwtUser {
  id: number;
  email: string;
  username: string;
  roleId: number;
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: IJwtUser;
    }
  }
}
