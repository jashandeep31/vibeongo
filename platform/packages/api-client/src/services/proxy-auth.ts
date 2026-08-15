export const PROXY_AUTHORIZATION_HEADER =
  "X-Vibeongo-Proxy-Authorization";

export function getProxyAuthorizationValue(accessToken: string) {
  return `Bearer ${accessToken}`;
}
