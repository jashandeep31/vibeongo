import { Request, Response } from "express";
import { and, db, eq, userConfigs } from "@repo/db";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { decryptData, encryptData } from "../../lib/encryption-decryption.js";

const userConfigTypeSchema = z.enum(["opencode", "codex", "pi"]);
const userConfigSchema = z.record(z.string(), z.unknown());

const createUserConfigSchema = z.object({
  configType: userConfigTypeSchema,
  config: userConfigSchema,
});

const updateUserConfigSchema = z.object({
  config: userConfigSchema,
});

const safeUserConfigSelection = {
  id: userConfigs.id,
  user_id: userConfigs.user_id,
  config_type: userConfigs.config_type,
  created_at: userConfigs.created_at,
  updated_at: userConfigs.updated_at,
};

export const getUserConfigs = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const configs = await db
      .select(safeUserConfigSelection)
      .from(userConfigs)
      .where(eq(userConfigs.user_id, user.id));

    res.status(200).json({
      data: configs,
    });
  },
);

export const getUserConfig = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const configType = userConfigTypeSchema.parse(req.params.configType);
  const [configRow] = await db
    .select({
      ...safeUserConfigSelection,
      iv: userConfigs.iv,
      tag: userConfigs.tag,
      encrypted_config: userConfigs.encrypted_config,
    })
    .from(userConfigs)
    .where(
      and(
        eq(userConfigs.user_id, user.id),
        eq(userConfigs.config_type, configType),
      ),
    );

  if (!configRow) {
    res.status(200).json({ data: null });
    return;
  }

  const config = userConfigSchema.parse(
    JSON.parse(
      decryptData({
        iv: configRow.iv,
        tag: configRow.tag,
        encrypted: configRow.encrypted_config,
      }),
    ),
  );

  res.status(200).json({
    data: {
      id: configRow.id,
      user_id: configRow.user_id,
      config_type: configRow.config_type,
      created_at: configRow.created_at,
      updated_at: configRow.updated_at,
      config,
    },
  });
});

export const createUserConfig = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const parsedData = createUserConfigSchema.parse(req.body);
    const [existingConfig] = await db
      .select({ id: userConfigs.id })
      .from(userConfigs)
      .where(
        and(
          eq(userConfigs.user_id, user.id),
          eq(userConfigs.config_type, parsedData.configType),
        ),
      );

    if (existingConfig) {
      throw new AppError("This configuration already exists", 409);
    }

    const encryptedConfig = encryptData(JSON.stringify(parsedData.config));
    const [config] = await db
      .insert(userConfigs)
      .values({
        user_id: user.id,
        config_type: parsedData.configType,
        iv: encryptedConfig.iv,
        tag: encryptedConfig.tag,
        encrypted_config: encryptedConfig.encryptedData,
      })
      .returning(safeUserConfigSelection);

    res.status(201).json({ data: config });
  },
);

export const updateUserConfig = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const configType = userConfigTypeSchema.parse(req.params.configType);
    const parsedData = updateUserConfigSchema.parse(req.body);
    const encryptedConfig = encryptData(JSON.stringify(parsedData.config));

    const [config] = await db
      .update(userConfigs)
      .set({
        iv: encryptedConfig.iv,
        tag: encryptedConfig.tag,
        encrypted_config: encryptedConfig.encryptedData,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(userConfigs.user_id, user.id),
          eq(userConfigs.config_type, configType),
        ),
      )
      .returning(safeUserConfigSelection);

    if (!config) throw new AppError("User configuration not found", 404);

    res.status(200).json({ data: config });
  },
);
