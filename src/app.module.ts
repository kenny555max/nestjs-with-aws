import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
//import { QuestionRotationModule } from './question-rotation/question-rotation.module';
import { QuestionModule } from './question/question.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
      //QuestionRotationModule
  QuestionModule,
      UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
