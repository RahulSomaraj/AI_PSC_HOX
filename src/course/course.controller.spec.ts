import { Test, TestingModule } from '@nestjs/testing';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { DeleteCourseDto } from './dto/delete-course.dto';

describe('CourseController - API Tests', () => {
  let controller: CourseController;
  let courseService: CourseService;

  const mockCourseService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        {
          provide: CourseService,
          useValue: mockCourseService,
        },
      ],
    }).compile();

    controller = module.get<CourseController>(CourseController);
    courseService = module.get<CourseService>(CourseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /course (create)', () => {
    it('should create a new course', async () => {
      const createCourseDto: CreateCourseDto = {
        title: 'Test Course',
        description: 'Test Course Description',
        price: 99.99,
        duration: 30,
        level: 'beginner',
        category: 'programming',
        instructor: 'John Doe',
        tags: ['javascript', 'web-development'],
      };

      const expectedResult = {
        id: 1,
        title: 'Test Course',
        description: 'Test Course Description',
        price: 99.99,
        duration: 30,
        level: 'beginner',
        category: 'programming',
        instructor: 'John Doe',
        tags: ['javascript', 'web-development'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCourseService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createCourseDto);

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.create).toHaveBeenCalledWith(createCourseDto);
    });

    it('should handle course creation with minimal data', async () => {
      const createCourseDto: CreateCourseDto = {
        title: 'Minimal Course',
        description: 'Minimal Description',
        price: 0,
        duration: 1,
        level: 'beginner',
        category: 'general',
        instructor: 'Unknown',
        tags: [],
      };

      const expectedResult = {
        id: 2,
        title: 'Minimal Course',
        description: 'Minimal Description',
        price: 0,
        duration: 1,
        level: 'beginner',
        category: 'general',
        instructor: 'Unknown',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCourseService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createCourseDto);

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.create).toHaveBeenCalledWith(createCourseDto);
    });
  });

  describe('GET /course (findAll)', () => {
    it('should return all courses', async () => {
      const expectedResult = [
        {
          id: 1,
          title: 'JavaScript Fundamentals',
          description: 'Learn JavaScript from scratch',
          price: 99.99,
          duration: 30,
          level: 'beginner',
          category: 'programming',
          instructor: 'John Doe',
          tags: ['javascript', 'web-development'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          title: 'Advanced React',
          description: 'Master React development',
          price: 149.99,
          duration: 45,
          level: 'advanced',
          category: 'programming',
          instructor: 'Jane Smith',
          tags: ['react', 'frontend'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCourseService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no courses exist', async () => {
      const expectedResult = [];

      mockCourseService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /course/:id (findOne)', () => {
    it('should return a specific course', async () => {
      const courseId = 1;
      const expectedResult = {
        id: 1,
        title: 'JavaScript Fundamentals',
        description: 'Learn JavaScript from scratch',
        price: 99.99,
        duration: 30,
        level: 'beginner',
        category: 'programming',
        instructor: 'John Doe',
        tags: ['javascript', 'web-development'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCourseService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(courseId.toString());

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.findOne).toHaveBeenCalledWith(1);
    });

    it('should handle non-existent course', async () => {
      const courseId = 999;
      const expectedResult = null;

      mockCourseService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(courseId.toString());

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('PATCH /course/:id (update)', () => {
    it('should update a course', async () => {
      const courseId = 1;
      const updateCourseDto: UpdateCourseDto = {
        title: 'Updated Course Title',
        description: 'Updated Course Description',
        price: 129.99,
        duration: 40,
        level: 'intermediate',
        category: 'programming',
        instructor: 'Updated Instructor',
        tags: ['updated', 'tags'],
      };

      const expectedResult = {
        id: 1,
        title: 'Updated Course Title',
        description: 'Updated Course Description',
        price: 129.99,
        duration: 40,
        level: 'intermediate',
        category: 'programming',
        instructor: 'Updated Instructor',
        tags: ['updated', 'tags'],
        updatedAt: new Date(),
      };

      mockCourseService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(courseId.toString(), updateCourseDto);

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.update).toHaveBeenCalledWith(1, updateCourseDto);
    });

    it('should handle partial updates', async () => {
      const courseId = 1;
      const updateCourseDto: UpdateCourseDto = {
        title: 'Only Title Updated',
      };

      const expectedResult = {
        id: 1,
        title: 'Only Title Updated',
        description: 'Original Description',
        price: 99.99,
        duration: 30,
        level: 'beginner',
        category: 'programming',
        instructor: 'John Doe',
        tags: ['javascript', 'web-development'],
        updatedAt: new Date(),
      };

      mockCourseService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(courseId.toString(), updateCourseDto);

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.update).toHaveBeenCalledWith(1, updateCourseDto);
    });
  });

  describe('DELETE /course/:id (remove)', () => {
    it('should delete a course', async () => {
      const courseId = 1;
      const deleteCourseDto: DeleteCourseDto = {
        reason: 'Course is outdated',
        confirmDelete: true,
      };

      const expectedResult = {
        message: 'Course deleted successfully',
        deletedCourse: {
          id: 1,
          title: 'Deleted Course',
        },
      };

      mockCourseService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(courseId.toString(), deleteCourseDto);

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.remove).toHaveBeenCalledWith(1, deleteCourseDto);
    });

    it('should handle deletion with confirmation', async () => {
      const courseId = 2;
      const deleteCourseDto: DeleteCourseDto = {
        reason: 'Duplicate course',
        confirmDelete: true,
      };

      const expectedResult = {
        message: 'Course deleted successfully',
        deletedCourse: {
          id: 2,
          title: 'Another Course',
        },
      };

      mockCourseService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(courseId.toString(), deleteCourseDto);

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.remove).toHaveBeenCalledWith(2, deleteCourseDto);
    });

    it('should handle deletion without confirmation', async () => {
      const courseId = 3;
      const deleteCourseDto: DeleteCourseDto = {
        reason: 'Testing deletion',
        confirmDelete: false,
      };

      const expectedResult = {
        message: 'Course deletion cancelled',
        reason: 'Deletion not confirmed',
      };

      mockCourseService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(courseId.toString(), deleteCourseDto);

      expect(result).toEqual(expectedResult);
      expect(mockCourseService.remove).toHaveBeenCalledWith(3, deleteCourseDto);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const createCourseDto: CreateCourseDto = {
        title: 'Error Course',
        description: 'This will cause an error',
        price: -100, // Invalid price
        duration: 0, // Invalid duration
        level: 'invalid', // Invalid level
        category: 'invalid', // Invalid category
        instructor: '',
        tags: [],
      };

      const errorMessage = 'Invalid course data provided';
      mockCourseService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createCourseDto)).rejects.toThrow(errorMessage);
      expect(mockCourseService.create).toHaveBeenCalledWith(createCourseDto);
    });
  });
});

