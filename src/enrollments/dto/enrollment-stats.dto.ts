export class EnrollmentStatsDto {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  pendingEnrollments: number;
  cancelledEnrollments: number;
  enrollmentsByCourse: {
    courseId: number;
    courseName: string;
    enrollmentCount: number;
  }[];
  recentEnrollments: {
    id: number;
    userId: number;
    courseId: number;
    status: string;
    enrolledAt: Date;
  }[];
}


