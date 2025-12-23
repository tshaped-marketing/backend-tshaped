type SameSiteType = 'none' | 'lax' | 'strict';

type CookieConfig = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: SameSiteType;
  path: string;
  maxAge?: number;
};

export const COOKIE_CONFIG_PROVIDER = (setCookie = true): CookieConfig => {
  if (setCookie) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in millisecondss
    };
  }
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  };
};
