import { Sandbox } from "e2b";
import { env } from "../../lib/env.js";
import { CreateInstanceProps } from "../types.js";
import { AppError } from "../../lib/app-error.js";

export class E2BClient {
  async createInstance({
    region,
    instanceType,
    instanceName,
    userData,
  }: CreateInstanceProps) {
    const sandbox = await Sandbox.create("test", {
      apiKey: env.E2B_KEY,
      timeoutMs: 1000 * 60 * 10,
    });

    sandbox.commands.run(
      `
cat > setup.sh <<'EOF'
${userData}
EOF

chmod +x setup.sh
./setup.sh
`,
      {
        // timeoutMs: 1000 * 60 * 10,
        // onStdout: (data: string) => {
        //   process.stdout.write(data);
        // },
      },
    );

    return {
      instanceId: sandbox.sandboxId,
      instanceName: instanceName,
      publicIPv4: sandbox.getHost(3101),
      pvtIPv4: sandbox.getHost(3101),
    };
  }
}
