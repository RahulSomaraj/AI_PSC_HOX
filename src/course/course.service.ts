import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { IsNull, Repository } from 'typeorm';
import { DeleteCourseDto } from './dto/delete-course.dto';

@Injectable()
export class CourseService {

  constructor(@InjectRepository(Course)
  private readonly CourseRepo:Repository<Course>            
  ){}


  async create(createCourseDto: CreateCourseDto) {
    try{
      const course=createCourseDto.courseName;
      const courseExists=await this.CourseRepo.findOne({
        where:[
          {courseName:course},
          {courseId:createCourseDto.courseId},
        ],
      })
      if(courseExists )
      {
        throw new ConflictException("Course Already Exists");
      }
      const createCourse=await this.CourseRepo.create(createCourseDto);
      return this.CourseRepo.save(createCourse);
    }
    catch(err)
    {
      throw new InternalServerErrorException(err.message)
    }
  }

  async findAll() {
    try{
      const courses=await this.CourseRepo.find({where:{deletedAt:IsNull()}});
      return courses;
    }
    catch(err)
    {
      throw new InternalServerErrorException(err.message);
    }
  }

  async findOne(Courseid: number) {
    try{
      const course=await this.CourseRepo.find({where:{id:Courseid,deletedAt:IsNull()}});
      if(!course)
      {
        throw new NotFoundException("Invalid CourseId");
      }
      return course;
    }
    catch(err)
    {
      throw new InternalServerErrorException(err.message);
    }
  }

  async update(id: number, updateCourseDto: UpdateCourseDto) {
    try{
      const updatecourse=await this.CourseRepo.update(id,updateCourseDto);
      if(!updatecourse)
      {
        throw new InternalServerErrorException("CourseId not Found");
      }
      const course=await this.CourseRepo.findOne({where:{id,deletedAt:IsNull()}});
      if (!course) {
      throw new InternalServerErrorException('Failed to retrieve updated course');
    }

      return course;
    } 
    catch(err)
    {
      throw new InternalServerErrorException(err.message);
    }
  }

  async remove(id: number,deleteCourseDto:DeleteCourseDto) {
    try{
      const course=await this.CourseRepo.findOne({where:{id,deletedAt:IsNull()}});
      if(!course)
      {
        throw new NotFoundException("CourseId not Found");
      }
      course.deletedBy=deleteCourseDto.deletedBy;
      course.deletedAt=new Date();
      await this.CourseRepo.save(course);
      return {message:"course deleted successfully"};
    }
    catch(err)
    {
      throw new InternalServerErrorException(err.message);
    }
  }
}
