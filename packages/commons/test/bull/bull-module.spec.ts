import * as randomstring from "randomstring";
import {
  Closer,
  ApplicationConfig,
  RedisConnectionConfig
} from "@zeroshotbuilders/commons";
import { BullTestingModule } from "./bull-testing-module";
import { BullTestingService } from "./bull-testing-service";
import { RedisContainer } from "@zeroshotbuilders/commons-testing";
import { Test, TestingModule } from "@nestjs/testing";
import { TestingBullWorker } from "./testing-bull-worker";
import { JobScenario } from "./testing-bull-queue";

describe("BullMQ utils", () => {
  let closer: Closer;
  let redisContainer: RedisContainer;
  let testingModule: TestingModule;
  let bullService: BullTestingService;

  beforeAll(async () => {
    redisContainer = new RedisContainer();
    await redisContainer.start();
    closer = Closer.create({
      resource: redisContainer,
      closingFunction: (redisContainer: RedisContainer) => redisContainer.stop()
    });
    testingModule = await Test.createTestingModule({
      providers: [BullTestingModule],
      imports: [BullTestingModule]
    })
      .overrideProvider(RedisConnectionConfig)
      .useValue(redisContainer.getConnectionConfig())
      .overrideProvider(Closer)
      .useValue(closer)
      .overrideProvider(ApplicationConfig)
      .useValue({
        applicationRoot: __dirname
      })
      .compile();
    bullService = testingModule.get(BullTestingService);
  }, 30000);

  afterAll(async () => {
    await closer.close();
  }, 30000);

  it("bull job should retry and eventually succeed", async () => {
    const inputData = randomstring.generate();
    const result = await bullService.doSomething({
      input: inputData,
      scenario: JobScenario.RETRYABLE_ERROR,
      succeedAfterAttempts: 2
    });
    expect(result.output).toEqual(
      inputData + TestingBullWorker.PROCESSING_SUFFIX
    );
    expect(result.attemptsMade).toEqual(2);
  });

  it("bull job should succeed", async () => {
    const inputData = randomstring.generate();
    const result = await bullService.doSomething({
      input: inputData,
      scenario: JobScenario.SUCCESS
    });
    expect(result.output).toEqual(
      inputData + TestingBullWorker.PROCESSING_SUFFIX
    );
    expect(result.attemptsMade).toEqual(0);
  });

  it("bull job should fail on unrecoverable exception", async () => {
    const inputData = randomstring.generate();
    try {
      await bullService.doSomething({
        input: inputData,
        scenario: JobScenario.UNRECOVERABLE_ERROR
      });
    } catch (error) {
      expect((error as Error).message).toEqual("GG");
    }
  });

  it("bull job should timeout", async () => {
    const inputData = randomstring.generate();
    try {
      await bullService.doSomething({
        input: inputData,
        scenario: JobScenario.TIMEOUT,
        timeout: 500
      });
      fail("Should have timed out");
    } catch (error: any) {
      expect(error.message).toContain("timed out after 500ms");
    }
  });
});
