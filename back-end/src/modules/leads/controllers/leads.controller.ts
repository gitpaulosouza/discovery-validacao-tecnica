import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { DecideLeadDto } from '@modules/leads/dtos/decide-lead.dto';
import { LeadDetailResponseDto } from '@modules/leads/dtos/lead-detail-response.dto';
import { LeadsService } from '@modules/leads/services/leads.service';

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get a lead with analysis, squad, decision and brief',
  })
  @ApiOkResponse({ type: LeadDetailResponseDto })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LeadDetailResponseDto> {
    return this.leadsService.findOne(id);
  }

  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register the Deal Desk decision for a lead' })
  @ApiOkResponse({ type: LeadDetailResponseDto })
  decide(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DecideLeadDto,
  ): Promise<LeadDetailResponseDto> {
    return this.leadsService.decide(id, dto);
  }
}
