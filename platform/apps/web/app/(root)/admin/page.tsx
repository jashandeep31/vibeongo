"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:8000";
const SERVERS_ENDPOINT = `${API_BASE_URL}/servers`;

type Ec2Server = {
  id: string;
  ec2_id: string;
  region: string;
  ip: string | null;
  status: "running" | "terminated";
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

const formatDate = (value: string | Date | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

function CopyButton({
  text,
  icon: Icon,
  title,
}: {
  text: string;
  icon: React.ElementType;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      title={title}
      className="ml-2"
    >
      {copied ? <Check className="size-3" /> : <Icon className="size-3" />}
    </Button>
  );
}

export default function AdminPage() {
  const [servers, setServers] = useState<Ec2Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingEc2Id, setDeletingEc2Id] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await axios.get<{ data: Ec2Server[] }>(SERVERS_ENDPOINT);
      setServers(response.data.data ?? []);
    } catch {
      setError("Failed to load servers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchServers();
  }, []);

  const handleCreateServer = async () => {
    try {
      setError(null);
      setIsCreating(true);
      await axios.post(SERVERS_ENDPOINT);
      window.location.reload();
    } catch {
      setError("Failed to create server");
      setIsCreating(false);
    }
  };

  const handleDeleteServer = async (ec2Id: string) => {
    try {
      setError(null);
      setDeletingEc2Id(ec2Id);
      await axios.delete(`${SERVERS_ENDPOINT}/${ec2Id}`);
      window.location.reload();
    } catch {
      setError("Failed to delete server");
      setDeletingEc2Id(null);
    }
  };

  return (
    <div className="container space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">EC2 Test Admin</h1>
        <Button onClick={handleCreateServer} disabled={isCreating}>
          {isCreating ? "Creating..." : "Create Server"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm">Loading servers...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>EC2 ID</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {servers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No servers found</TableCell>
              </TableRow>
            ) : (
              servers.map((server) => (
                <TableRow key={server.ec2_id}>
                  <TableCell>{server.ec2_id}</TableCell>
                  <TableCell>{server.region}</TableCell>
                  <TableCell>
                    {server.ip ? (
                      <div className="flex items-center">
                        {server.ip}
                        <CopyButton
                          text={server.ip}
                          icon={Copy}
                          title="Copy IP"
                        />
                        <CopyButton
                          text={`ssh ubuntu@${server.ip}`}
                          icon={Terminal}
                          title="Copy SSH Command"
                        />
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{server.status}</TableCell>
                  <TableCell>{formatDate(server.created_at)}</TableCell>
                  <TableCell>{formatDate(server.updated_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteServer(server.ec2_id)}
                      disabled={deletingEc2Id === server.ec2_id}
                    >
                      {deletingEc2Id === server.ec2_id
                        ? "Deleting..."
                        : "Delete"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
