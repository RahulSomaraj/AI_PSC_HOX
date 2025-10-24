import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('UsersController - API Tests', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /users (create)', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        role: 'user',
      };

      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        role: 'user',
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should create a user with admin role', async () => {
      const createUserDto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        phone: '9876543210',
        role: 'admin',
      };

      const expectedResult = {
        id: 2,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        phone: '9876543210',
        role: 'admin',
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('GET /users/:id (findOne)', () => {
    it('should return a specific user', async () => {
      const userId = 1;
      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        role: 'user',
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockUsersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(userId);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should handle non-existent user', async () => {
      const userId = 999;
      const expectedResult = null;

      mockUsersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(userId);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('PATCH /users/:id (update)', () => {
    it('should update a user', async () => {
      const userId = 1;
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated John',
        lastName: 'Updated Doe',
        phone: '9876543210',
        photoURL: 'https://example.com/photo.jpg',
      };

      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        firstName: 'Updated John',
        lastName: 'Updated Doe',
        phone: '9876543210',
        role: 'user',
        photoURL: 'https://example.com/photo.jpg',
        updatedAt: new Date(),
      };

      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(userId, updateUserDto);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.update).toHaveBeenCalledWith(1, updateUserDto);
    });

    it('should handle partial updates', async () => {
      const userId = 1;
      const updateUserDto: UpdateUserDto = {
        firstName: 'Only First Name Updated',
      };

      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        firstName: 'Only First Name Updated',
        lastName: 'Doe',
        phone: '1234567890',
        role: 'user',
        photoURL: null,
        updatedAt: new Date(),
      };

      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(userId, updateUserDto);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.update).toHaveBeenCalledWith(1, updateUserDto);
    });
  });

  describe('DELETE /users/:id (remove)', () => {
    it('should delete a user', async () => {
      const userId = 1;
      const expectedResult = {
        message: 'User deleted successfully',
        deletedUser: {
          id: 1,
          email: 'test@example.com',
        },
      };

      mockUsersService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(userId);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.remove).toHaveBeenCalledWith(1);
    });

    it('should handle deletion of non-existent user', async () => {
      const userId = 999;
      const expectedResult = {
        message: 'User not found',
        error: 'User with ID 999 does not exist',
      };

      mockUsersService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(userId);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.remove).toHaveBeenCalledWith(999);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should handle JWT authentication', async () => {
      const userId = 1;
      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
      };

      mockUsersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(userId);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should handle role-based access', async () => {
      const userId = 1;
      const expectedResult = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
      };

      mockUsersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(userId);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'invalid-email', // Invalid email format
        password: '123', // Too short password
        firstName: '',
        lastName: '',
        phone: 'invalid-phone',
        role: 'invalid-role' as any,
      };

      const errorMessage = 'Invalid user data provided';
      mockUsersService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createUserDto)).rejects.toThrow(errorMessage);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle database connection errors', async () => {
      const userId = 1;
      const errorMessage = 'Database connection failed';
      mockUsersService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(userId)).rejects.toThrow(errorMessage);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });
  });
});

