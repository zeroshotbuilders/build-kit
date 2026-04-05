import { ApplicationConfig } from "@zeroshotbuilders/commons";
import {
  OPENAI_CLIENT,
  OpenaiClientModule,
  OpenaiService
} from "@zeroshotbuilders/openai-utils";
import { Test } from "@nestjs/testing";
import { OpenaiClientConfig } from "../src/config/openai-client-config";

export const createLocalOpenaiService = async (): Promise<OpenaiService> => {
  const testingModule = await Test.createTestingModule({
    imports: [OpenaiClientModule.forApplicationRoot("")]
  })
    .overrideProvider(ApplicationConfig)
    .useValue({
      local: true
    })
    .overrideProvider(OpenaiClientConfig)
    .useValue({
      apiToken: "test-token",
      model: "test-model",
      temperature: 1
    })
    .compile();
  return testingModule.get(OPENAI_CLIENT);
};
