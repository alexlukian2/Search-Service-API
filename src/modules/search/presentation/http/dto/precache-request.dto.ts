import { IsOptional, IsArray, IsString, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PrecacheRequestDto {
  @ApiProperty({
    description: 'List of queries to precache',
    required: false,
    type: [String],
    example: ['typescript', 'nestjs', 'redis'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  queries?: string[];
}
