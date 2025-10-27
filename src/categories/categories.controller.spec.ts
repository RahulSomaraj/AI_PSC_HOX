import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesController - API Tests', () => {
  let controller: CategoriesController;
  let categoriesService: CategoriesService;

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    categoriesService = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /categories (create)', () => {
    it('should create a new category', async () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Test Category',
        description: 'Test Description',
      };

      const expectedResult = {
        id: 1,
        name: 'Test Category',
        description: 'Test Description',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCategoriesService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createCategoryDto);

      expect(result).toEqual(expectedResult);
      expect(mockCategoriesService.create).toHaveBeenCalledWith(
        createCategoryDto,
      );
    });
  });

  describe('GET /categories (findAll)', () => {
    it('should return all categories', async () => {
      const expectedResult = [
        { id: 1, name: 'Category 1', description: 'Description 1' },
        { id: 2, name: 'Category 2', description: 'Description 2' },
      ];

      mockCategoriesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockCategoriesService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /categories/:id (findOne)', () => {
    it('should return a specific category', async () => {
      const categoryId = 1;
      const expectedResult = {
        id: 1,
        name: 'Test Category',
        description: 'Test Description',
      };

      mockCategoriesService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(categoryId);

      expect(result).toEqual(expectedResult);
      expect(mockCategoriesService.findOne).toHaveBeenCalledWith(categoryId);
    });
  });

  describe('PATCH /categories/:id (update)', () => {
    it('should update a category', async () => {
      const categoryId = 1;
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Category',
        description: 'Updated Description',
      };

      const serviceResult = {
        id: 1,
        name: 'Updated Category',
        description: 'Updated Description',
        updatedAt: new Date(),
      };

      const expectedResult = {
        message: 'Update Successfull',
        data: serviceResult,
      };

      mockCategoriesService.update.mockResolvedValue(serviceResult);

      const result = await controller.update(categoryId, updateCategoryDto);

      expect(result).toEqual(expectedResult);
      expect(mockCategoriesService.update).toHaveBeenCalledWith(
        categoryId,
        updateCategoryDto,
      );
    });
  });

  describe('DELETE /categories/:id (remove)', () => {
    it('should delete a category', async () => {
      const categoryId = 1;
      const expectedResult = { message: 'Category deleted successfully' };

      mockCategoriesService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(categoryId);

      expect(result).toEqual(expectedResult);
      expect(mockCategoriesService.remove).toHaveBeenCalledWith(categoryId);
    });
  });
});
