import { stdin, stdout } from "node:process";
import { createInterface, emitKeypressEvents } from "node:readline";

export async function readApiKey(): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY) {
    const readline = createInterface({ input: stdin, output: stdout });
    try {
      return (
        await new Promise<string>((resolve, reject) => {
          let answered = false;
          readline.once("close", () => {
            if (!answered) reject(new Error("No API key provided"));
          });
          readline.question("API key: ", (answer) => {
            answered = true;
            resolve(answer);
          });
        })
      ).trim();
    } finally {
      readline.close();
    }
  }

  return new Promise<string>((resolve, reject) => {
    const wasRaw = stdin.isRaw;
    let value = "";

    const finish = (error?: Error) => {
      stdin.off("keypress", onKeypress);
      stdin.off("end", onEnd);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value.trim());
    };

    const onEnd = () => finish(new Error("Login cancelled"));
    const onKeypress = (
      text: string,
      key: { name?: string; ctrl?: boolean; meta?: boolean },
    ) => {
      if (key.ctrl && (key.name === "c" || key.name === "d")) {
        finish(new Error("Login cancelled"));
      } else if (key.name === "return" || key.name === "enter") {
        finish();
      } else if (key.name === "backspace" || key.name === "delete") {
        value = value.slice(0, -1);
      } else if (!key.ctrl && !key.meta && text && !/[\r\n\x1b]/.test(text)) {
        value += text;
      }
    };

    emitKeypressEvents(stdin);
    stdin.on("keypress", onKeypress);
    stdin.on("end", onEnd);
    stdin.setRawMode(true);
    stdin.resume();
    stdout.write("API key: ");
  });
}
