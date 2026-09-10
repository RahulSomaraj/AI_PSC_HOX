import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { UserSession } from '../auth/entities/user-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Role } from '../common/enums/role.enum';
import { DeleteUserDto } from './dto/delete-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepositories: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
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
        role: Role.User,
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
  async findAll(){
    try{
        const users=await this.userRepositories.find({where: { deletedAt: IsNull() }, });
        return users;
      }
    catch(err)
    {
      throw new InternalServerErrorException('Failed to retrieve users');
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

  /**
   * Activate or deactivate an account - the Deactivate control on the admin
   * user detail page.
   *
   * Deactivating takes effect on the next request because JwtStrategy reads
   * isActive from the database on every call. The live sessions are revoked
   * as well, otherwise the account could keep rotating fresh tokens through
   * POST /auth/refresh, which does not look at isActive.
   */
  async setStatus(id: number, isActive: boolean, actorId?: number) {
    const user = await this.userRepositories.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException('User not found');

    // An admin deactivating their own account would be locked out on their
    // very next request, with no way back in.
    if (!isActive && actorId !== undefined && id === actorId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    user.isActive = isActive;
    user.updatedBy = actorId ?? null;
    const saved = await this.userRepositories.save(user);

    if (!isActive) {
      await this.sessionRepository.update(
        { user: { id }, revoked: false },
        { revoked: true },
      );
    }

    return saved;
  }

  async updateRole(id: number, role: Role) {
    const user = await this.userRepositories.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException('User not found');

    user.role = role;
    return await this.userRepositories.save(user);
  }

  async remove(id: number, deleteUserDto: DeleteUserDto): Promise<{ message: string }> {
    const user = await this.userRepositories.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    await this.userRepositories.update(id,{
      deletedAt:new Date(),
      deletedBy:deleteUserDto.deletedBy,
      isActive:false
    });
    return { message: `User with ID ${id} has been successfully removed` };
  }
}
