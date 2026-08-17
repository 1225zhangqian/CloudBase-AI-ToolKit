import { describe, expect, it, vi } from "vitest";
import {
  isValidCloudRunBuildId,
  waitForCloudRunDeployRegistration,
} from "./cloudrun.js";

describe("isValidCloudRunBuildId", () => {
  it("accepts positive finite numbers only", () => {
    expect(isValidCloudRunBuildId(1)).toBe(true);
    expect(isValidCloudRunBuildId(42)).toBe(true);
    expect(isValidCloudRunBuildId(0)).toBe(false);
    expect(isValidCloudRunBuildId(-1)).toBe(false);
    expect(isValidCloudRunBuildId(undefined)).toBe(false);
    expect(isValidCloudRunBuildId("12")).toBe(false);
    expect(isValidCloudRunBuildId(Number.NaN)).toBe(false);
  });
});

describe("waitForCloudRunDeployRegistration", () => {
  it("returns immediately when BuildId appears on first poll", async () => {
    const call = vi.fn().mockResolvedValue({
      Task: { Id: 7, Status: "running" },
    });
    const getDeployRecords = vi.fn().mockResolvedValue({
      DeployRecords: [{ BuildId: 1001, Status: "building" }],
    });
    const sleepFn = vi.fn().mockResolvedValue(undefined);

    const result = await waitForCloudRunDeployRegistration({
      manager: { commonService: () => ({ call }) },
      cloudrunService: { getDeployRecords },
      envId: "env-test",
      serverName: "svc-a",
      maxWaitMs: 30_000,
      intervalMs: 3_000,
      sleepFn,
    });

    expect(result).toMatchObject({
      registered: true,
      timedOut: false,
      taskId: 7,
      buildId: 1001,
      taskStatus: "running",
    });
    expect(result.waitMs).toBeLessThan(1000);
    expect(sleepFn).not.toHaveBeenCalled();
    expect(call).toHaveBeenCalledWith({
      Action: "DescribeServerManageTask",
      Param: {
        EnvId: "env-test",
        ServerName: "svc-a",
        TaskId: 0,
      },
    });
  });

  it("keeps polling until BuildId > 0 even if Task.Id appears first", async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ Task: { Id: 9, Status: "todo" } })
      .mockResolvedValue({ Task: { Id: 9, Status: "running" } });
    const getDeployRecords = vi
      .fn()
      .mockResolvedValueOnce({ DeployRecords: [{ BuildId: 0 }] })
      .mockResolvedValueOnce({ DeployRecords: [] })
      .mockResolvedValue({ DeployRecords: [{ BuildId: 55 }] });
    const sleepFn = vi.fn().mockResolvedValue(undefined);

    const result = await waitForCloudRunDeployRegistration({
      manager: { commonService: () => ({ call }) },
      cloudrunService: { getDeployRecords },
      envId: "env-test",
      serverName: "svc-b",
      maxWaitMs: 20_000,
      intervalMs: 10,
      sleepFn,
    });

    expect(result.registered).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.buildId).toBe(55);
    expect(result.taskId).toBe(9);
    expect(sleepFn).toHaveBeenCalled();
    expect(getDeployRecords.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("times out with taskId when BuildId never becomes valid", async () => {
    const call = vi.fn().mockResolvedValue({
      Task: { Id: 3, Status: "running" },
    });
    const getDeployRecords = vi.fn().mockResolvedValue({
      DeployRecords: [{ BuildId: 0 }],
    });
    const sleepFn = vi.fn().mockResolvedValue(undefined);

    const result = await waitForCloudRunDeployRegistration({
      manager: { commonService: () => ({ call }) },
      cloudrunService: { getDeployRecords },
      envId: "env-test",
      serverName: "svc-c",
      maxWaitMs: 25,
      intervalMs: 10,
      sleepFn,
    });

    expect(result.registered).toBe(true);
    expect(result.timedOut).toBe(true);
    expect(result.taskId).toBe(3);
    expect(result.buildId).toBeUndefined();
  });

  it("times out unregistered when neither task nor BuildId appears", async () => {
    const call = vi.fn().mockResolvedValue({ Task: {} });
    const getDeployRecords = vi.fn().mockResolvedValue({ DeployRecords: [] });
    const sleepFn = vi.fn().mockResolvedValue(undefined);

    const result = await waitForCloudRunDeployRegistration({
      manager: { commonService: () => ({ call }) },
      cloudrunService: { getDeployRecords },
      envId: "env-test",
      serverName: "svc-d",
      maxWaitMs: 25,
      intervalMs: 10,
      sleepFn,
    });

    expect(result.registered).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.buildId).toBeUndefined();
    expect(result.taskId).toBeUndefined();
  });

  it("tolerates missing commonService / getDeployRecords and still times out safely", async () => {
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const result = await waitForCloudRunDeployRegistration({
      manager: {},
      cloudrunService: {},
      envId: "env-test",
      serverName: "svc-e",
      maxWaitMs: 20,
      intervalMs: 5,
      sleepFn,
    });
    expect(result.registered).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});
