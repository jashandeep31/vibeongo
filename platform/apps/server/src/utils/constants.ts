export const tierLimits = {
  tier1: {
    manual: 2,
    auto: 1,
  },
  tier2: {
    manual: 3,
    auto: 2,
  },
  tier3: {
    manual: 3,
    auto: 2,
  },
} as const;

export const demoReposToFork = [
  {
    reponame: "todo-nextjs",
    ownername: "jashandeep31",
    project: {
      name: "todo-nextjs",
      description: "",
      provider: "aws",
      instanceTypeId: "f5cc34ea-e819-48f5-a858-8298e10e6754",
      sandboxTypeId: "a6617669-8424-472b-be1d-d5b95f3826dd",
      sshKeyIds: ["6834735d-a160-4095-800c-7d9e98f24ecc"],
      initialScript: "",
      finalScript: `cd /home/ubuntu/code/todo-nextjs
npm i`,
      devScript: `cd /home/ubuntu/code/todo-nextjs
npm run dev`,
      config: {
        ports: [],
        packages: [
          {
            name: "docker",
            config: { containers: [] },
          },
          {
            name: "opencode",
            config: {
              auth_json: {},
              use_user_config: true,
              model: "",
              requirePassword: false,
            },
          },
          {
            name: "codex",
            config: {
              auth_json: {},
              use_user_config: true,
            },
          },
          {
            name: "pi",
            config: {
              auth_json: {},
              use_user_config: true,
            },
          },
        ],
      },
    },
  },
] as const;
