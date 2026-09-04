import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DataSource, In, Repository, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';
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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * pscId lives on aspirant_profiles, and the User entity carries no inverse
   * relation to join through. Rather than reshaping the main query - and the
   * count its pagination depends on - the ids for the current page are looked
   * up in one bounded follow-up query and attached to the rows.
   *
   * A user with no aspirant profile, or one predating the pscId column, gets
   * null.
   */
  private async attachPscIds<T extends { id: number }>(
    users: T[],
  ): Promise<Array<T & { pscId: string | null }>> {
    if (users.length === 0) return [];

    const profiles = await this.dataSource
      .getRepository(AspirantProfile)
      .find({
        where: { userId: In(users.map((user) => user.id)), deletedAt: IsNull() },
        select: { userId: true, pscId: true },
      });

    const pscIdByUserId = new Map(
      profiles.map((profile) => [profile.userId, profile.pscId]),
    );

    return users.map((user) => ({
      ...user,
      pscId: pscIdByUserId.get(user.id) ?? null,
    }));
  }

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
        batchId,
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

      // Batch assignment lives on the aspirant profile, not on the user, so
      // the match goes through that table. The deletedAt condition is stated
      // explicitly rather than relying on the @DeleteDateColumn filter, which
      // applies to entity reads and not to a hand-built subquery.
      if (batchId) {
        qb.andWhere(
          `EXISTS ${qb
            .subQuery()
            .select('1')
            .from(AspirantProfile, 'aspirantProfile')
            .where('aspirantProfile.userId = user.id')
            .andWhere('aspirantProfile.batchId = :batchId')
            .andWhere('aspirantProfile.deletedAt IS NULL')
            .getQuery()}`,
        ).setParameter('batchId', batchId);
      }

      // sortBy and sortOrder are constrained to enum values by the DTO, so
      // they are safe to interpolate here.
      qb.orderBy(`user.${sortBy}`, sortOrder)
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();

      return {
        data: await this.attachPscIds(data),
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
