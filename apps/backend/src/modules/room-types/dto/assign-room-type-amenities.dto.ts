import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class AssignRoomTypeAmenitiesDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Amenity IDs to assign to this room type.',
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  amenityIds!: number[];
}
