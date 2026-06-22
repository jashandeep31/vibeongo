"use client";

import NavCommandBox from "@/components/nav-command-box";

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <NavCommandBox />
      {children}
    </>
  );
};

export default Provider;
