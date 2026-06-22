export type AdminNavItem = {
  label: string;
  href: string;
};

export type AdminNavGroup = {
  heading: string;
  items: AdminNavItem[];
};

export const adminNavGroups = [
  {
    heading: "Admin",
    items: [
      { label: "Overview", href: "/" },
      { label: "Users", href: "/users" },
      { label: "Regions", href: "/regions" },
    ],
  },
  {
    heading: "AWS",
    items: [
      { label: "AWS Images", href: "/aws/images" },
      { label: "AWS Instances", href: "/aws/instances" },
    ],
  },
] satisfies AdminNavGroup[];

export const adminNavItems = adminNavGroups.flatMap((group) => group.items);
