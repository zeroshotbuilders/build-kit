import { Injectable } from "@nestjs/common";
import {
  TestingBullJobRequest,
  TestingBullJobResponse,
  TestingBullQueue
} from "./testing-bull-queue";

@Injectable()
export class BullTestingService {
  constructor(private testQueue: TestingBullQueue) {}

  public async doSomething(
    request: TestingBullJobRequest
  ): Promise<TestingBullJobResponse> {
    return this.testQueue
      .add(request)
      .then((job) => job.waitUntilFinished(this.testQueue.getQueueEvents()));
  }
}
