import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // 로컬 네트워크의 다른 기기(휴대폰 등)에서 dev 서버에 접속 허용.
  // Next dev는 이미 0.0.0.0에 바인딩되지만, 16부터 다른 호스트의 cross-origin
  // dev 요청을 차단하므로 LAN 대역을 허용 목록에 추가한다.
  allowedDevOrigins: ['192.168.0.8', '192.168.0.*'],
};

export default nextConfig;
