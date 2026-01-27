// API 설정 - 환경에 따라 다른 URL 사용
export const API_CONFIG = {
  // 프로덕션 URL
  BASE_URL: 'https://moneger.vercel.app',

  // 개발 URL (필요시 환경변수로 오버라이드)
  DEV_URL: 'http://localhost:3000',
} as const;

export const getBaseUrl = () => {
  // 환경변수가 있으면 사용
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 개발 환경 체크
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return API_CONFIG.DEV_URL;
  }

  return API_CONFIG.BASE_URL;
};
