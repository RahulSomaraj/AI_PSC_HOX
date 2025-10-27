import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { retry } from 'rxjs';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly CategoryRepo: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const name = createCategoryDto.name;
      const exists = await this.CategoryRepo.findOne({ where: { name } });
      if (exists) {
        throw new ConflictException('Category already exists');
      }
      const category = await this.CategoryRepo.create(createCategoryDto);

      return this.CategoryRepo.save(category);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async findAll() {
    try {
      const GetAllCategories = await this.CategoryRepo.find();
      return GetAllCategories;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async findOne(id: number) {
    try {
      const category = this.CategoryRepo.findOne({ where: { id } });
      if (!category) {
        throw new InternalServerErrorException('Category not exists');
      }
      return category;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    try {
      const result = await this.CategoryRepo.update(id, updateCategoryDto);
      if (!result) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      const updated = await this.CategoryRepo.findOne({ where: { id } });
      return updated;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async remove(id: number) {
    try {
      const result = await this.CategoryRepo.findOne({ where: { id } });
      if (!result) {
        throw new NotFoundException('Category not found');
      }
      await this.CategoryRepo.remove(result);
      return { message: `succesfully deleted` };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
