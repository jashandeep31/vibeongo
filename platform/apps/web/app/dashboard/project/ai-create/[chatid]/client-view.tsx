"use client";
import { InputArea } from "@/components/input-area/input-area";

interface ClientViewProps {
  chatid: string;
}

const ClientView = ({ chatid }: ClientViewProps) => {
  return (
    <div className="flex h-full flex-col justify-between">
      <div></div>
      <div className="px-4 pb-4 md:px-0">
        <div className="mx-auto w-full md:w-2/3">
          <InputArea />
        </div>
      </div>
    </div>
  );
};

export default ClientView;
