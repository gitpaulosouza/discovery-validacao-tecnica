import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

export class UserEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true, type: String })
  name!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPrisma(user: User): UserEntity {
    const { id, email, name, createdAt, updatedAt } = user;
    return Object.assign(new UserEntity(), {
      id,
      email,
      name,
      createdAt,
      updatedAt,
    });
  }
}
