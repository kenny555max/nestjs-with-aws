import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {ValidationPipe} from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
      new ValidationPipe({
        transform: true,   // Automatically transform payloads to match DTO types
        whitelist: true,   // Strip properties that are not in the DTO
        forbidNonWhitelisted: true, // Optionally, throw an error if non-whitelisted properties are present
      }),
  );

  const config = new DocumentBuilder()
      .setTitle('My API')
      .setDescription('API description')
      .setVersion('1.0')
      .addTag('my-api')
      .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Use the global exception filter
//  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3000);
}
bootstrap();

if (require.main === module) {
  bootstrap();
}
