import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApplication } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApplication(app);

  const port = configService.get<number>('port', 8080);
  await app.listen(port);
}

void bootstrap();
