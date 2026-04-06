import { AiAgentModule } from "@zeroshotbuilders/agentic-workflows";
import { ConfigModule } from "@zeroshotbuilders/commons";
import { DynamicModule, Module } from "@nestjs/common";
import { SalaryExtractionAgent } from "./salary-extraction-agent";

@Module({})
export class SalaryExtractionModule {
  static forApplicationRoot(applicationRoot: string): DynamicModule {
    return {
      module: SalaryExtractionModule,
      providers: [SalaryExtractionAgent],
      imports: [
        ConfigModule.forApplicationRoot(applicationRoot),
        AiAgentModule.forApplicationRoot(applicationRoot)
      ],
      exports: [SalaryExtractionAgent]
    };
  }
}
