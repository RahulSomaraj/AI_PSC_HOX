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
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Role } from '../common/enums/role.enum';
import { DeleteUserDto } from './dto/delete-user.dto';
import {
  FindUsersQueryDto,
  SortOrder,
  UserSortBy,
} from './dto/find-users-query.dto';

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
        role: Role.User,
      });
      return await this.userRepositories.save(user);
    } catch (err) {
      console.error('Create user error:', err);
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  /**
   * `role` narrows the lookup: GET /users/:id passes Role.User so that an
   * admin record is reported as 404 rather than rendered on the student
   * profile page. /users/me omits it so an admin can still read itself.
   */
  async findOne(id: number, role?: Role) {
    try {
      const user = await this.userRepositories.findOne({
        where: { id, ...(role ? { role } : {}), deletedAt: IsNull() },
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
  async findAll(query: FindUsersQueryDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
        courseId,
        isActive,
        sortBy = UserSortBy.CreatedAt,
        sortOrder = SortOrder.Desc,
      } = query;

      const qb = this.userRepositories
        .createQueryBuilder('user')
        .where('user.deletedAt IS NULL');

      if (search) {
        qb.andWhere(
          '(LOWER(user.firstName) LIKE LOWER(:search)' +
            ' OR LOWER(user.lastName) LIKE LOWER(:search)' +
            ' OR user.phone LIKE :search)',
          { search: `%${search}%` },
        );
      }

      if (role) {
        qb.andWhere('user.role = :role', { role });
      }

      if (isActive !== undefined) {
        qb.andWhere('user.isActive = :isActive', { isActive });
      }

      // EXISTS rather than a join: a student with two enrollments in the same
      // course would otherwise appear twice and inflate the total.
      if (courseId) {
        qb.andWhere(
          `EXISTS ${qb
            .subQuery()
            .select('1')
            .from(Enrollment, 'enrollment')
            .where('enrollment.userId = user.id')
            .andWhere('enrollment.courseId = :courseId')
            .getQuery()}`,
        ).setParameter('courseId', courseId);
      }

      // sortBy and sortOrder are constrained to enum values by the DTO, so
      // they are safe to interpolate here.
      qb.orderBy(`user.${sortBy}`, sortOrder)
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err) {
      throw new InternalServerErrorException('Failed to retrieve users');
    }
  }

  async countByRole(role?: Role) {
    try {
      const count = await this.userRepositories.count({
        where: { ...(role ? { role } : {}), deletedAt: IsNull() },
      });
      return { role: role ?? 'all', count };
    } catch (err) {
      throw new InternalServerErrorException('Failed to count users');
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

  async updateStatus(id: number, isActive: boolean) {
    const user = await this.userRepositories.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException('User not found');

    user.isActive = isActive;
    return await this.userRepositories.save(user);
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
