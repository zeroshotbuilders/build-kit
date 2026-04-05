import {
  Closer,
  ConfigModule,
  ApplicationConfig,
  REDIS_CLIENT,
  RedisConnectionConfig,
  RedisConnectionModule,
  RedisClientPool,
  randomInt
} from "@zeroshotbuilders/commons";
import { RedisContainer, timeout } from "@zeroshotbuilders/commons-testing";
import { Test, TestingModule } from "@nestjs/testing";
import * as randomstring from "randomstring";
import { RedisClientType } from "redis";

describe("Redis module", () => {
  let testModule: TestingModule;
  let closer: Closer;
  let redisClient: RedisClientType;
  let redisClientPool: RedisClientPool;
  beforeAll(async () => {
    const redisContainer = new RedisContainer();
    await redisContainer.start();
    testModule = await Test.createTestingModule({
      imports: [
        RedisConnectionModule.forApplicationRoot(__dirname),
        ConfigModule.forApplicationRoot(__dirname)
      ]
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
    closer = testModule.get(Closer);
    redisClient = testModule.get(REDIS_CLIENT);
    redisClientPool = testModule.get(RedisClientPool);
    closer.registerShutdownHook({
      resource: redisContainer,
      closingFunction: async (redisContainer: RedisContainer) =>
        await redisContainer.stop()
    });
  }, 20000);

  afterAll(async () => {
    if (closer) await closer.close();
  });

  it("should fail when a value cannot be set due to a change", async () => {
    const key = randomstring.generate();
    const val1 = randomstring.generate();
    await redisClient.set(key, val1);
    await redisClient.watch(key);
    const val2 = randomstring.generate();
    const multi = redisClient.multi().set(key, val2);
    await redisClient.set(key, val2);
    await expect(multi.exec()).rejects.toThrow();
  });

  it("should fail when a value is changed by another client", async () => {
    const key = randomstring.generate();
    const val1 = randomstring.generate();
    await redisClientPool.withConnection((client) => client.set(key, val1));
    const results = [];
    const val2 = randomstring.generate();
    const val3 = randomstring.generate();
    for (let i = 0; i < 10; i++) {
      const [resultOne, _] = await Promise.allSettled([
        redisClientPool.withConnection(async (client) => {
          await client.watch(key);
          const multi = client.multi().set(key, val2);
          await timeout(randomInt(0, 500));
          const [result] = await multi.exec();
          return result;
        }),
        redisClientPool.withConnection(async (client) => {
          await client.unwatch();
          const multi = client.multi().set(key, val3);
          await timeout(randomInt(0, 500));
          const [result] = await multi.exec();
          return result;
        })
      ]);
      results.push(resultOne);
    }
    const rejectedPromises = results.filter(
      (promise) => promise.status === "rejected"
    );
    expect(rejectedPromises.length).toBeGreaterThan(0);
    const [rejection] = rejectedPromises;
    expect(rejection).toEqual({
      reason: new Error("One (or more) of the watched keys has been changed"),
      status: "rejected"
    });
  });
});
