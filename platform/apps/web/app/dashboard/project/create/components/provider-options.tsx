import { type ComponentType, type SVGProps } from "react";
import { type ProjectProvider } from "@repo/shared";

type ProviderLogo = ComponentType<SVGProps<SVGSVGElement>>;

interface ProviderOption {
  id: ProjectProvider;
  name: string;
  serviceName: string;
  description: string;
  recommended: boolean;
  Logo: ProviderLogo;
}

function AwsLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 24" fill="none" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M10.6 14.8c-.4.3-1 .5-1.6.5-.8 0-1.4-.3-1.4-1 0-.9.8-1.3 2.1-1.3h.9v1.8Zm2.1-3.8c0-2-1.1-3.1-3.6-3.1-1.3 0-2.4.4-3.2.9l.7 1.7c.7-.4 1.5-.7 2.3-.7 1.2 0 1.7.4 1.7 1.3v.4h-1c-2.8 0-4.3 1.1-4.3 3 0 1.7 1.1 2.7 2.9 2.7 1.1 0 2-.4 2.7-1.2.2.5.5.9.9 1.2l1.6-1.1c-.5-.7-.7-1.2-.7-2.2V11Zm8.3 5.9h-2.3l-1.5-6.1-1.5 6.1h-2.3L11 8.2h2.2l1.5 6.4 1.6-6.4h2l1.6 6.4 1.5-6.4h2.2L21 16.9Zm6.7.3c-1.4 0-2.8-.4-3.8-1.1l.8-1.7c.9.5 2 .9 3 .9.9 0 1.4-.3 1.4-.8 0-.6-.5-.8-1.8-1.2-2.2-.6-3.1-1.3-3.1-2.8 0-1.7 1.4-2.7 3.7-2.7 1.2 0 2.4.3 3.3.8l-.7 1.7c-.8-.4-1.7-.6-2.5-.6-.9 0-1.5.3-1.5.8s.5.7 1.9 1.1c2.1.6 3.1 1.3 3.1 2.9-.1 1.6-1.5 2.7-3.8 2.7Z"
      />
      <path
        fill="#FF9900"
        d="M31.8 19.1c-6.7 3.1-14.3 3.3-21.2.6-.4-.2-.1-.6.3-.5 6.7 1.8 13.9 1.6 20.4-.7.7-.3 1.2.3.5.6Zm.8-1.1c-.2-.3-1.5-.2-2.1-.1-.2 0-.2-.2 0-.3 1.3-.9 3.5-.6 3.8-.3.3.4-.1 2.5-1.3 3.5-.2.2-.4.1-.3-.2.3-.6 1.1-2.3.9-2.6Z"
      />
    </svg>
  );
}

function DigitalOceanLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        fill="#0080FF"
        d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10H8v-4h4a6 6 0 1 0-6-6v3H2v-3A10 10 0 0 1 12 2Z"
      />
      <path fill="#0080FF" d="M2 17h4v4H2zm6-4h4v4H8z" />
    </svg>
  );
}

export const providerOptions = [
  {
    id: "aws",
    name: "AWS",
    serviceName: "EC2",
    description: "Amazon EC2 regions and instance types.",
    recommended: true,
    Logo: AwsLogo,
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    serviceName: "Droplets",
    description: "DigitalOcean regions and Droplet sizes.",
    recommended: false,
    Logo: DigitalOceanLogo,
  },
] satisfies ProviderOption[];
