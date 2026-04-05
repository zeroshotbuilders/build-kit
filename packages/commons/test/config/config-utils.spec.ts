import * as randomstring from "randomstring";
import { loadConfig, runWithEnv, randomInt } from "@zeroshotbuilders/commons";

interface TestConfig {
  key1: number;
  key2: string;
  listLol: string[];
  nested: {
    key3: string;
  };
  moarNested: {
    key4: number;
    key5: {
      key6: string;
    };
  };
}

describe("loadConfig", () => {
  it("should load a configuration file and return the correct object", () => {
    const configPath = "./config/test-config.yaml";
    const config = loadConfig<TestConfig>(__dirname, "", configPath);
    expect(config).toEqual({
      key1: 1.01,
      key2: "value2",
      nested: {
        key3: "value3"
      },
      listLol: ["a", "b", "c"],
      moarNested: {
        key4: 2,
        key5: {
          key6: "value6"
        }
      }
    });
  });

  it("should load a configuration file and return the correct object when a config key is provided", () => {
    const configPath = "./config/test-config.yaml";
    const config = loadConfig<TestConfig>(__dirname, "moarNested", configPath);
    expect(config).toEqual({
      key4: 2,
      key5: {
        key6: "value6"
      }
    });
  });

  it("should load a configuration file and return the correct object when a nested config key is provided", () => {
    const configPath = "./config/test-config.yaml";
    const config = loadConfig<TestConfig>(__dirname, "moarNested.key5", configPath);
    expect(config).toEqual({
      key6: "value6"
    });
  });

  it("should load a configuration file and override the values with env vars", () => {
    const configPath = "./config/test-config.yaml";
    const key1Value = "23.1";
    const key6Value = randomstring.generate();
    const key4Value = randomInt();
    const key7Value = false;
    const key8Value = true;
    const key9Value = 0.75;
    runWithEnv(() => {
      const config = loadConfig<TestConfig>(__dirname, "", configPath);
      expect(config).toEqual({
        key1: key1Value,
        key2: "value2",
        nested: {
          key3: "value3"
        },
        listLol: ["a", "b", "c"],
        moarNested: {
          key4: key4Value,
          key5: {
            key6: key6Value
          },
          key7: key7Value,
          key8: key8Value,
          key9: key9Value
        }
      });
    }, [
      ["app_key1", key1Value],
      ["app_moarNested___key5___key6", key6Value],
      ["app_moarNested___key4_numeric", key4Value.toString()],
      ["app_moarNested___key7_boolean", key7Value.toString()],
      ["app_moarNested___key8_boolean", key8Value.toString()],
      ["app_moarNested___key9_numeric", "0.75"]
    ]);
  });
});
