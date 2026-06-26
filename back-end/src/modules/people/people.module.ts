import { Module } from '@nestjs/common';

import { PeopleService } from './services/people.service';

@Module({
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
