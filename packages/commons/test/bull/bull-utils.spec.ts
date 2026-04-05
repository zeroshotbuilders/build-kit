import { withCheckedExceptions } from "../../src/bull/bull-utils";
import { ServerError, Status } from "nice-grpc";
import { UnrecoverableError } from "bullmq";

describe("Bull utils", () => {
  it("should return result", async () => {
    const response = await withCheckedExceptions(async () => "rekt");
    expect(response).toEqual("rekt");
  });

  it("should throw recoverable exception", async () => {
    try {
      await withCheckedExceptions(() => {
        throw new ServerError(Status.INTERNAL, "Connection timeout");
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("should throw unrecoverable exception for grpc errors", async () => {
    try {
      await withCheckedExceptions(() => {
        throw new ServerError(Status.NOT_FOUND, "Customer not found");
      });
    } catch (error) {
      expect(error).toBeInstanceOf(UnrecoverableError);
    }
  });
});
