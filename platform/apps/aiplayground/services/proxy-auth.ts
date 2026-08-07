export const PROXY_AUTHORIZATION_HEADER =
  "X-Vibeongo-Proxy-Authorization";

export function getProxyAuthorizationValue(accessToken: string) {
  return `Bearer ${accessToken}`;
}

export function getProxyAuthorizationFromRequest(request: Request) {
  const authorization = request.headers.get(PROXY_AUTHORIZATION_HEADER);
  if (!authorization) {
    throw new Error("Proxy authorization header is required");
  }

  return authorization;
}
