export type PlaygroundChat = {
  id: string;
  name: string;
  url: string;
  isRunning?: boolean;
  opencodeServerUrl?: string;
};

export type PlaygroundProject = {
  id: string;
  name: string;
  url: string;
  defaultOpen?: boolean;
  chats: PlaygroundChat[];
};

export const playgroundProjects: PlaygroundProject[] = [
  {
    id: "website-launch",
    name: "Website Launch",
    url: "/projects/website-launch",
    defaultOpen: true,
    chats: [
      {
        id: "landing-page-copy",
        name: "Landing page copy",
        url: "/projects/website-launch/chats/landing-page-copy",
        isRunning: true,
        opencodeServerUrl: "http://192.168.1.69:4096",
      },
      {
        id: "fix-authentication",
        name: "Fix authentication",
        url: "/projects/website-launch/chats/fix-authentication",
      },
    ],
  },
  {
    id: "mobile-app",
    name: "Mobile App",
    url: "/projects/mobile-app",
    defaultOpen: true,
    chats: [
      {
        id: "api-integration",
        name: "API integration",
        url: "/projects/mobile-app/chats/api-integration",
        isRunning: true,
      },
      {
        id: "onboarding-flow",
        name: "Onboarding flow",
        url: "/projects/mobile-app/chats/onboarding-flow",
      },
    ],
  },
];
