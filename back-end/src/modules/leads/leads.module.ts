import { Module } from '@nestjs/common';

import { PeopleModule } from '@modules/people/people.module';
import { LeadsController } from '@/modules/leads/controllers';
import { LeadsService } from '@modules/leads/services';

@Module({
  imports: [PeopleModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
