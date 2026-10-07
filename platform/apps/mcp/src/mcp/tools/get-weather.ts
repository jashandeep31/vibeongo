import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export type Weather = {
  location: string;
  temperatureCelsius: number;
};

async function fakeWeatherApi(location: string): Promise<Weather> {
  return {
    location,
    temperatureCelsius: 37,
  };
}

export async function getWeather(location: string): Promise<Weather> {
  return fakeWeatherApi(location);
}

export function registerWeatherTool(server: McpServer): void {
  server.registerTool(
    "getWeather",
    {
      description: "Get the current temperature for a location in Celsius.",
      inputSchema: z.object({
        location: z.string().min(1).describe("The city or location to check."),
      }),
    },
    async ({ location }) => {
      const weather = await getWeather(location);
      return {
        content: [
          {
            type: "text",
            text: `${weather.location}: ${weather.temperatureCelsius}°C`,
          },
        ],
        structuredContent: weather,
      };
    },
  );
}
