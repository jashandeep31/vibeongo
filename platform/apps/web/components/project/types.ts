export type Project = {
  id: string;
  name: string;
  status: string;
  metrics: {
    uptime: string;
    billing: {
      total: string;
      bandwidth: string;
      compute: string;
    };
  };
  config: {
    os: string;
    system_user: {
      username: string;
      password: string;
      is_sudo_user: boolean;
    };
    packages: {
      name: string;
      config: {
        command?: string;
        containers?: {
          name: string;
          compose_file_url: string;
          filename: string;
        }[];
      };
    }[];
    git_config: {
      repo_url: string;
      branch: string;
      path: string;
    }[];
    env_configs: {
      path: string;
      data: string;
    }[];
  };
};
