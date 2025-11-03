import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { EnrollmentStatsDto } from './dto/enrollment-stats.dto';
import { User } from '../users/entities/user.entity';
import { Course } from '../course/entities/course.entity';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async create(createEnrollmentDto: CreateEnrollmentDto): Promise<Enrollment> {
    // Validate that user exists
    const user = await this.userRepository.findOne({
      where: { id: createEnrollmentDto.userId, deletedAt: IsNull() },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${createEnrollmentDto.userId} not found`);
    }

    // Validate that course exists
    const course = await this.courseRepository.findOne({
      where: { id: createEnrollmentDto.courseId, deletedAt: IsNull() },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${createEnrollmentDto.courseId} not found`);
    }

    // Check if enrollment already exists
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        userId: createEnrollmentDto.userId,
        courseId: createEnrollmentDto.courseId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('User is already enrolled in this course');
    }

    // Create enrollment with enrolledAt as current timestamp
    const enrollment = this.enrollmentRepository.create({
      userId: createEnrollmentDto.userId,
      courseId: createEnrollmentDto.courseId,
      status: createEnrollmentDto.status || 'active',
      enrolledAt: new Date(),
    });

    return await this.enrollmentRepository.save(enrollment);
  }

  async findAll(): Promise<Enrollment[]> {
    return await this.enrollmentRepository.find({
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: number): Promise<Enrollment[]> {
    return await this.enrollmentRepository.find({
      where: { userId },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCourse(courseId: number): Promise<Enrollment[]> {
    return await this.enrollmentRepository.find({
      where: { courseId },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  async update(
    id: number,
    updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<Enrollment> {
    const enrollment = await this.findOne(id);

    if (updateEnrollmentDto.status) {
      enrollment.status = updateEnrollmentDto.status;
    }

    if (updateEnrollmentDto.completedAt) {
      enrollment.completedAt = new Date(updateEnrollmentDto.completedAt);
    }

    return await this.enrollmentRepository.save(enrollment);
  }

  async remove(id: number): Promise<void> {
    const enrollment = await this.findOne(id);
    await this.enrollmentRepository.remove(enrollment);
  }

  async getStats(): Promise<EnrollmentStatsDto> {
    // Get all enrollments
    const allEnrollments = await this.enrollmentRepository.find({
      relations: ['course'],
    });

    // Count by status
    const totalEnrollments = allEnrollments.length;
    const activeEnrollments = allEnrollments.filter(
      (e) => e.status === 'active',
    ).length;
    const completedEnrollments = allEnrollments.filter(
      (e) => e.status === 'completed',
    ).length;
    const pendingEnrollments = allEnrollments.filter(
      (e) => e.status === 'pending',
    ).length;
    const cancelledEnrollments = allEnrollments.filter(
      (e) => e.status === 'cancelled',
    ).length;

    // Count enrollments by course
    const enrollmentsByCourseMap = new Map();
    allEnrollments.forEach((enrollment) => {
      const key = `${enrollment.courseId}-${enrollment.course?.courseName || 'Unknown'}`;
      enrollmentsByCourseMap.set(
        key,
        (enrollmentsByCourseMap.get(key) || 0) + 1,
      );
    });

    const enrollmentsByCourse = Array.from(enrollmentsByCourseMap.entries()).map(
      ([key, count]) => {
        const [courseId, courseName] = key.split('-');
        return {
          courseId: parseInt(courseId),
          courseName,
          enrollmentCount: count,
        };
      },
    );

    // Get recent enrollments (last 10)
    const recentEnrollments = await this.enrollmentRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['user', 'course'],
    });

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      pendingEnrollments,
      cancelledEnrollments,
      enrollmentsByCourse: enrollmentsByCourse.sort(
        (a, b) => b.enrollmentCount - a.enrollmentCount,
      ),
      recentEnrollments: recentEnrollments.map((e) => ({
        id: e.id,
        userId: e.userId,
        courseId: e.courseId,
        status: e.status,
        enrolledAt: e.enrolledAt || e.createdAt,
      })),
    };
  }

  async getCourseEnrollmentCount(courseId: number): Promise<number> {
    return await this.enrollmentRepository.count({
      where: { courseId, status: 'active' },
    });
  }

  async getUserEnrollmentCount(userId: number): Promise<number> {
    return await this.enrollmentRepository.count({
      where: { userId, status: 'active' },
    });
  }
}

