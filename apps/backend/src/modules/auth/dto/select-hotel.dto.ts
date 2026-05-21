import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class SelectHotelDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hotelId!: number;

  @IsString()
  @IsNotEmpty()
  hotelSelectionToken!: string;
}
