import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCloudBaseManager, mockGetEnvId } = vi.hoisted(() => ({
  mockGetCloudBaseManager: vi.fn(),
  mockGetEnvId: vi.fn(),
}));

vi.mock("../cloudbase-manager.js", () => ({
  getCloudBaseManager: mockGetCloudBaseManager,
  getEnvId: mockGetEnvId,
}));

import { ensureCloudRunEnvInitialized } from "./cloudrun.js";

function makeManager(callImpl: (options: unknown) => Promise<unknown>) {
  return {
    commonService: vi.fn().mockReturnValue({ call: callImpl }),
  };
}

describe("ensureCloudRunEnvInitialized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when DescribeEnvBaseInfo reports IsExist=true (initialized)", async () => {
    mockGetCloudBaseManager.mockReturnValue(
      makeManager(async () => ({
        EnvBaseInfo: { EnvId: "env-test", PackageType: "Standard", Status: "normal" },
        IsExist: true,
        RequestId: "req",
      })),
    );
    await expect(
      ensureCloudRunEnvInitialized({
        cloudBaseOptions: {},
        envId: "env-test",
        serverName: "demo",
      }),
    ).resolves.toBe(true);
    expect(mockGetCloudBaseManager).toHaveBeenCalledTimes(1);
  });

  it("blocks when DescribeEnvBaseInfo reports IsExist=false (uninitialized, real API behavior)", async () => {
    // 2026-08-13 真实凭据实测：未开通云托管的环境 DescribeEnvBaseInfo 返回
    // IsExist=false 且 EnvBaseInfo 为空结构（不抛错），不是错误码。
    mockGetCloudBaseManager.mockReturnValue(
      makeManager(async () => ({
        EnvBaseInfo: {
          EnvId: "env-test",
          Alias: "",
          Status: "",
          Region: "",
          EnvType: "",
          PackageType: "",
          VpcId: "",
          CreateTime: "",
          SubnetIds: "",
          Recycle: "",
        },
        IsExist: false,
        RequestId: "req",
      })),
    );
    const promise = ensureCloudRunEnvInitialized({
      cloudBaseOptions: {},
      envId: "env-test",
      serverName: "demo",
    });
    await expect(promise).rejects.toThrow(/尚未初始化云托管/);
    await expect(promise).rejects.toThrow(/CreateCloudRunEnv/);
    await expect(promise).rejects.toThrow(/env-test/);
  });

  it("blocks when DescribeEnvBaseInfo throws ResourceNotFound (uninitialized)", async () => {
    mockGetCloudBaseManager.mockReturnValue(
      makeManager(async () => {
        throw new Error("ResourceNotFound.CloudRunEnv: cloudrun env not opened");
      }),
    );
    await expect(
      ensureCloudRunEnvInitialized({
        cloudBaseOptions: {},
        envId: "env-test",
        serverName: "demo",
      }),
    ).rejects.toThrow(/尚未初始化云托管/);
  });

  it("blocks on InvalidParameter with env/cloudrun context", async () => {
    mockGetCloudBaseManager.mockReturnValue(
      makeManager(async () => {
        throw new Error("InvalidParameter.EnvironmentIdNotFound: env not found");
      }),
    );
    await expect(
      ensureCloudRunEnvInitialized({
        cloudBaseOptions: {},
        envId: "env-test",
        serverName: "demo",
      }),
    ).rejects.toThrow(/尚未初始化云托管/);
  });

  it("does not block on bare InvalidParameter (transient parameter error)", async () => {
    mockGetCloudBaseManager.mockReturnValue(
      makeManager(async () => {
        throw new Error("InvalidParameter: bad request");
      }),
    );
    await expect(
      ensureCloudRunEnvInitialized({
        cloudBaseOptions: {},
        envId: "env-test",
        serverName: "demo",
      }),
    ).resolves.toBe(true);
  });

  it("does not block on network/permission errors (lets the caller handle them)", async () => {
    mockGetCloudBaseManager.mockReturnValue(
      makeManager(async () => {
        throw new Error("socket hang up");
      }),
    );
    await expect(
      ensureCloudRunEnvInitialized({
        cloudBaseOptions: {},
        envId: "env-test",
        serverName: "demo",
      }),
    ).resolves.toBe(true);
  });

  it("does not block on InvalidAction-like errors (no bare not.?found matching)", async () => {
    // 实测：tcbr 不存在 DescribeCloudRunEnv 单数 Action，若误用会返回 InvalidAction
    // 且消息含 "not found in service"；不应把这种 Action 不存在误判为未初始化。
    mockGetCloudBaseManager.mockReturnValue(
      makeManager(async () => {
        throw new Error(
          "[DescribeCloudRunEnv] The request action=`DescribeCloudRunEnv` is invalid or not found in service=`tcbr` and version=`2022-02-17`.",
        );
      }),
    );
    await expect(
      ensureCloudRunEnvInitialized({
        cloudBaseOptions: {},
        envId: "env-test",
        serverName: "demo",
      }),
    ).resolves.toBe(true);
  });

  it("degrades to allowed when the SDK has no commonService", async () => {
    mockGetCloudBaseManager.mockReturnValue({});
    await expect(
      ensureCloudRunEnvInitialized({
        cloudBaseOptions: {},
        envId: "env-test",
        serverName: "demo",
      }),
    ).resolves.toBe(true);
  });
});
