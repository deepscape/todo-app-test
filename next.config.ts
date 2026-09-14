import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 홈 디렉토리의 무관한 yarn.lock까지 워크스페이스 루트 후보로 잡혀
  // "multiple lockfiles" 경고가 발생하는 것을 막기 위해 루트를 명시적으로 고정.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
