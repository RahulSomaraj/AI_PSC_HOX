import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepositories: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const email = createUserDto.email.trim().toLowerCase();

      const exists = await this.userRepositories.findOne({
        where: { email, deletedAt: IsNull() },
      });

      if (exists) {
        throw new ConflictException('Use another Email');
      }
      const { password, ...rest } = createUserDto;
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
      });
      const user = this.userRepositories.create({
        ...rest,
        passwordHash,
      });
      return await this.userRepositories.save(user);
    } catch (err) {
      console.error('Create user error:', err);
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.userRepositories.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepositories.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, updateUserDto);
    return await this.userRepositories.save(user);
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.userRepositories.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    await this.userRepositories.remove(user);
    return { message: `User with ID ${id} has been successfully removed` };
  }
}
