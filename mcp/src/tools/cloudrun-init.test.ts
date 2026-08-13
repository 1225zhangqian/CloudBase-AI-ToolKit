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

  it("returns true when DescribeCloudRunEnv succeeds (initialized)", async () => {
    mockGetCloudBaseManager.mockReturnValue(
      makeManager(async () => ({ EnvId: "env-test", RequestId: "req" })),
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

  it("blocks when DescribeCloudRunEnv reports resource not found (uninitialized)", async () => {
    mockGetCloudBaseManager.mockReturnValue(
      makeManager(async () => {
        throw new Error("ResourceNotFound.CloudRunEnv: cloudrun env not opened");
      }),
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
