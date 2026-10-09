import test from "node:test";
import assert from "node:assert/strict";
import { WebClient, MobileClient } from "../dist/index.js";

const user = {
  id: "test-user",
  email: "tester@example.invalid",
  username: "maker_test",
  firstName: "Maker",
  lastName: null,
  primaryLoginMethod: "email_password",
  emailVerified: false,
};

test("password authentication client sends credentialed requests and unwraps user responses", async () => {
  const client = new WebClient("https://server.example.test");
  const requests = [];
  client.apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return {
      data: { data: user },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  const credentials = {
    firstName: "Test Maker",
    email: user.email,
    password: "a sufficiently long passphrase",
  };
  assert.deepEqual(await client.users.signupWithPassword(credentials), user);
  assert.deepEqual(await client.users.signinWithPassword(credentials), user);
  assert.deepEqual(await client.users.getCurrentUser(), user);
  assert.deepEqual(
    requests.map(({ method, url }) => [method, url]),
    [
      ["post", "/api/v1/users/signup"],
      ["post", "/api/v1/users/signin"],
      ["get", "/api/v1/users/me"],
    ],
  );
  assert.ok(requests.every(({ withCredentials }) => withCredentials === true));
  assert.deepEqual(JSON.parse(requests[0].data), credentials);
  assert.deepEqual(JSON.parse(requests[1].data), credentials);
  assert.equal(requests[2].data, undefined);
  assert.equal(requests[0].headers.Authorization, undefined);
});

test("password client propagates failed requests without converting them into successful users", async () => {
  const client = new WebClient("https://server.example.test");
  const failure = new Error("Unauthorized");
  client.apiClient.defaults.adapter = async () => {
    throw failure;
  };
  await assert.rejects(
    client.users.signinWithPassword({
      firstName: "Test Maker",
      email: user.email,
      password: "a sufficiently long passphrase",
    }),
    failure,
  );
  await assert.rejects(
    client.users.signupWithPassword({
      firstName: "Test Maker",
      email: user.email,
      password: "a sufficiently long passphrase",
    }),
    failure,
  );
  await assert.rejects(client.users.getCurrentUser(), failure);
});

test("mobile password auth returns bearer tokens and user data without cookies or stale authorization", async () => {
  const client = new MobileClient("https://server.example.test", "old-token");
  const requests = [];
  const result = { token: "new-token", data: user };
  client.apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: result, status: 200, statusText: "OK", headers: {}, config };
  };
  const credentials = {
    firstName: "Test Maker",
    email: user.email,
    password: "a sufficiently long passphrase",
  };
  assert.deepEqual(
    await client.users.mobileSignupWithPassword(credentials),
    result,
  );
  assert.deepEqual(
    await client.users.mobileSigninWithPassword(credentials),
    result,
  );
  assert.deepEqual(
    requests.map(({ url }) => url),
    ["/api/v1/users/mobile/signup", "/api/v1/users/mobile/signin"],
  );
  assert.ok(
    requests.every(
      ({ withCredentials, headers }) =>
        withCredentials === false && !headers.Authorization,
    ),
  );
  assert.deepEqual(JSON.parse(requests[0].data), credentials);
});

test("GitHub linking uses account routes and preserves authenticated bearer headers", async () => {
  const client = new MobileClient(
    "https://server.example.test",
    "signed-in-token",
  );
  const requests = [];
  client.apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return {
      data: {
        data:
          config.method === "get"
            ? { connected: false, username: null }
            : config.url.endsWith("complete")
              ? user
              : { url: "https://github.com/login/oauth/authorize" },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  assert.deepEqual(await client.users.getGithubConnection(), {
    connected: false,
    username: null,
  });
  const payload = {
    clientType: "mobile",
    state: "app-state",
    codeChallenge: "challenge",
  };
  await client.users.startGithubConnection(payload);
  await client.users.completeMobileGithubConnection({
    ticket: "ticket",
    state: "app-state",
    codeVerifier: "verifier",
  });
  assert.deepEqual(
    requests.map(({ url }) => url),
    [
      "/api/v1/users/github-connection",
      "/api/v1/users/github-connection",
      "/api/v1/users/github-connection/mobile/complete",
    ],
  );
  assert.ok(
    requests.every(
      ({ headers }) => headers.Authorization === "Bearer signed-in-token",
    ),
  );
  assert.deepEqual(JSON.parse(requests[1].data), payload);
  assert.equal(requests[1].withCredentials, false);
  await client.users.startGithubConnection({ clientType: "web" });
  assert.equal(requests[3].withCredentials, true);
});
