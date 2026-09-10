import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { ExamLevelsService } from '../../exam-levels/exam-levels.service';
import { ExamPostsService } from '../../exam-posts/exam-posts.service';
import { ExamStagesService } from '../../exam-stages/exam-stages.service';
import { SubjectsService } from '../../subjects/subjects.service';
import { TopicsService } from '../../topics/topics.service';
import { SubtopicsService } from '../../subtopics/subtopics.service';
import { SyllabusService } from '../../syllabus/syllabus.service';
import { ExamSyllabus } from '../../syllabus/entities/exam-syllabus.entity';
import { ExamMode } from '../../common/enums/exam-mode.enum';
import { SyllabusPriority } from '../../common/enums/syllabus-priority.enum';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

/**
 * Seeds the exam and syllabus hierarchy with Kerala PSC reference data.
 *
 * It runs through the real services, so everything it writes passes the same
 * validation as the API: a topic must belong to its subject, a stage to its
 * exam, and a combination may only be mapped once.
 *
 * Idempotent - a record that already exists is left alone and reported as
 * skipped, so it is safe to re-run after adding new entries below.
 *
 *   npm run seed:exam-syllabus
 *
 * The npm script compiles first and runs the JS out of `dist`, because
 * app.module loads its entities from the compiled `.entity.js` files under
 * `dist`. Running the TypeScript directly would hand TypeORM a second,
 * unrelated copy of every entity class and every repository lookup would miss.
 */

// app.module turns TypeORM query logging on when NODE_ENV is `development`,
// and .env sets exactly that. A seed writes hundreds of rows, so the SQL
// buries the progress output - opt back in with SEED_SQL_LOG=1.
if (!process.env.SEED_SQL_LOG) {
  process.env.NODE_ENV = 'production';
}

// ---------------------------------------------------------------------------
// Exam structure
// ---------------------------------------------------------------------------

const EXAM_LEVELS: { name: string; description: string; sortOrder: number }[] =
  [
    {
      name: '10th Level',
      description: 'Posts with SSLC as the minimum qualification',
      sortOrder: 1,
    },
    {
      name: 'Plus Two Level',
      description: 'Posts with higher secondary as the minimum qualification',
      sortOrder: 2,
    },
    {
      name: 'Degree Level',
      description: 'Posts that require a bachelor degree',
      sortOrder: 3,
    },
    {
      name: 'Technical',
      description: 'Engineering, polytechnic and other technical posts',
      sortOrder: 4,
    },
    {
      name: 'Teaching',
      description: 'School and higher secondary teaching posts',
      sortOrder: 5,
    },
    {
      name: 'KAS',
      description: 'Kerala Administrative Service',
      sortOrder: 6,
    },
  ];

interface StageSeed {
  name: string;
  examMode: ExamMode;
  totalQuestions?: number;
  totalMarks?: number;
  durationMinutes?: number;
  negativeMark?: number;
  description?: string;
}

interface ExamSeed {
  name: string;
  shortName: string;
  department: string;
  qualification: string;
  stages: StageSeed[];
}

const OBJECTIVE_100: Omit<StageSeed, 'name'> = {
  examMode: ExamMode.Objective,
  totalQuestions: 100,
  totalMarks: 100,
  durationMinutes: 75,
  negativeMark: 0.33,
};

const EXAMS: { level: string; exams: ExamSeed[] }[] = [
  {
    level: '10th Level',
    exams: [
      {
        name: 'Lower Division Clerk',
        shortName: 'LDC',
        department: 'Various Departments',
        qualification: 'SSLC or equivalent',
        stages: [{ name: 'Main Examination', ...OBJECTIVE_100 }],
      },
      {
        name: 'Last Grade Servant',
        shortName: 'LGS',
        department: 'Various Departments',
        qualification: 'SSLC, and must not have passed higher qualifications',
        stages: [{ name: 'Main Examination', ...OBJECTIVE_100 }],
      },
      {
        name: 'Village Field Assistant',
        shortName: 'VFA',
        department: 'Revenue Department',
        qualification: 'SSLC or equivalent',
        stages: [{ name: 'Main Examination', ...OBJECTIVE_100 }],
      },
    ],
  },
  {
    level: 'Plus Two Level',
    exams: [
      {
        name: 'Civil Police Officer',
        shortName: 'CPO',
        department: 'Kerala Police',
        qualification: 'Plus Two or equivalent',
        stages: [
          {
            name: 'Physical Efficiency Test',
            examMode: ExamMode.Physical,
            description: 'Endurance and body measurement test',
          },
          { name: 'Main Examination', ...OBJECTIVE_100 },
          {
            name: 'Document Verification',
            examMode: ExamMode.DocumentVerification,
          },
        ],
      },
      {
        name: 'Lower Division Typist',
        shortName: 'LD Typist',
        department: 'Various Departments',
        qualification: 'Plus Two with typewriting certificate',
        stages: [{ name: 'Main Examination', ...OBJECTIVE_100 }],
      },
    ],
  },
  {
    level: 'Degree Level',
    exams: [
      {
        name: 'Sub Inspector of Police',
        shortName: 'SI',
        department: 'Kerala Police',
        qualification: 'Any degree from a recognised university',
        stages: [
          {
            name: 'Preliminary Examination',
            ...OBJECTIVE_100,
            description: 'Objective screening test held across the state',
          },
          {
            name: 'Main Examination',
            ...OBJECTIVE_100,
            durationMinutes: 90,
            description: 'Objective test for candidates shortlisted in prelims',
          },
          {
            name: 'Physical Efficiency Test',
            examMode: ExamMode.Physical,
            description: 'Endurance events and body measurement',
          },
          {
            name: 'Document Verification',
            examMode: ExamMode.DocumentVerification,
          },
        ],
      },
      {
        name: 'Secretariat Assistant',
        shortName: 'SA',
        department: 'Kerala Government Secretariat',
        qualification: 'Any degree from a recognised university',
        stages: [
          { name: 'Preliminary Examination', ...OBJECTIVE_100 },
          { name: 'Main Examination', ...OBJECTIVE_100, durationMinutes: 90 },
        ],
      },
      {
        name: 'University Assistant',
        shortName: 'UA',
        department: 'Universities in Kerala',
        qualification: 'Any degree from a recognised university',
        stages: [{ name: 'Main Examination', ...OBJECTIVE_100 }],
      },
      {
        name: 'Assistant Prison Officer',
        shortName: 'APO',
        department: 'Prisons and Correctional Services',
        qualification: 'Any degree from a recognised university',
        stages: [
          { name: 'Preliminary Examination', ...OBJECTIVE_100 },
          { name: 'Physical Efficiency Test', examMode: ExamMode.Physical },
          { name: 'Main Examination', ...OBJECTIVE_100 },
        ],
      },
    ],
  },
  {
    level: 'Technical',
    exams: [
      {
        name: 'Assistant Engineer (Civil)',
        shortName: 'AE Civil',
        department: 'Public Works Department',
        qualification: 'BTech or BE in Civil Engineering',
        stages: [{ name: 'Main Examination', ...OBJECTIVE_100 }],
      },
      {
        name: 'Overseer Grade III (Civil)',
        shortName: 'Overseer',
        department: 'Public Works Department',
        qualification: 'Diploma in Civil Engineering',
        stages: [{ name: 'Main Examination', ...OBJECTIVE_100 }],
      },
    ],
  },
  {
    level: 'Teaching',
    exams: [
      {
        name: 'LP School Teacher',
        shortName: 'LPST',
        department: 'General Education Department',
        qualification: 'Plus Two with TTC or D.El.Ed',
        stages: [{ name: 'Main Examination', ...OBJECTIVE_100 }],
      },
      {
        name: 'UP School Teacher',
        shortName: 'UPST',
        department: 'General Education Department',
        qualification: 'Degree with TTC or D.El.Ed',
        stages: [{ name: 'Main Examination', ...OBJECTIVE_100 }],
      },
    ],
  },
  {
    level: 'KAS',
    exams: [
      {
        name: 'Kerala Administrative Service',
        shortName: 'KAS',
        department: 'Government of Kerala',
        qualification: 'Any degree from a recognised university',
        stages: [
          {
            name: 'Preliminary Examination',
            ...OBJECTIVE_100,
            durationMinutes: 90,
            description: 'Objective screening test',
          },
          {
            name: 'Main Examination',
            examMode: ExamMode.Descriptive,
            totalMarks: 300,
            durationMinutes: 180,
            description: 'Descriptive papers',
          },
          {
            name: 'Interview',
            examMode: ExamMode.Interview,
            totalMarks: 50,
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Global academic structure - one row per subject, shared by every exam
// ---------------------------------------------------------------------------

interface SubjectSeed {
  name: string;
  description: string;
  topics: { name: string; subtopics?: string[] }[];
}

const SUBJECTS: SubjectSeed[] = [
  {
    name: 'Indian Constitution',
    description: 'The Constitution of India, its articles and amendments',
    topics: [
      {
        name: 'Constitutional History',
        subtopics: [
          'Regulating Act 1773',
          'Government of India Act 1935',
          'Constituent Assembly',
          'Drafting Committee',
        ],
      },
      {
        name: 'Preamble',
        subtopics: [
          'Objectives Resolution',
          'Keywords of the Preamble',
          'Amendability of the Preamble',
        ],
      },
      {
        name: 'Fundamental Rights',
        subtopics: [
          'Article 14',
          'Article 15',
          'Article 16',
          'Article 19',
          'Article 21',
          'Article 32',
        ],
      },
      {
        name: 'Fundamental Duties',
        subtopics: ['Article 51A', 'Swaran Singh Committee'],
      },
      {
        name: 'Directive Principles of State Policy',
        subtopics: ['Article 39', 'Article 44', 'Article 45'],
      },
      {
        name: 'Parliament',
        subtopics: [
          'Lok Sabha',
          'Rajya Sabha',
          'Money Bill',
          'Parliamentary Committees',
        ],
      },
      {
        name: 'President',
        subtopics: [
          'Election of the President',
          'Powers of the President',
          'Impeachment',
        ],
      },
      {
        name: 'Judiciary',
        subtopics: [
          'Supreme Court',
          'High Courts',
          'Judicial Review',
          'Public Interest Litigation',
        ],
      },
      {
        name: 'Constitutional Amendments',
        subtopics: [
          'First Amendment',
          '42nd Amendment',
          '73rd and 74th Amendments',
        ],
      },
    ],
  },
  {
    name: 'Kerala History',
    description: 'Kerala from the Sangam age to the formation of the state',
    topics: [
      {
        name: 'Ancient Kerala',
        subtopics: ['Sangam Age', 'Cheras of Mahodayapuram'],
      },
      {
        name: 'Medieval Kerala',
        subtopics: [
          'Zamorin of Calicut',
          'Portuguese in Kerala',
          'Dutch and the English in Kerala',
        ],
      },
      {
        name: 'Kerala Renaissance',
        subtopics: [
          'Sree Narayana Guru',
          'Ayyankali',
          'Chattambi Swamikal',
          'Vaikom Satyagraha',
          'Temple Entry Proclamation',
        ],
      },
      {
        name: 'Freedom Movement in Kerala',
        subtopics: [
          'Malabar Rebellion',
          'Punnapra-Vayalar Uprising',
          'Quit India Movement in Kerala',
        ],
      },
      {
        name: 'Formation of Kerala',
        subtopics: ['States Reorganisation Act 1956', 'First Kerala Ministry'],
      },
    ],
  },
  {
    name: 'Indian History',
    description: 'Ancient, medieval and modern India with the freedom struggle',
    topics: [
      {
        name: 'Ancient India',
        subtopics: [
          'Indus Valley Civilisation',
          'Vedic Age',
          'Mauryan Empire',
          'Gupta Empire',
        ],
      },
      {
        name: 'Medieval India',
        subtopics: ['Delhi Sultanate', 'Mughal Empire', 'Bhakti Movement'],
      },
      {
        name: 'Modern India',
        subtopics: [
          'Advent of the Europeans',
          'Revolt of 1857',
          'Socio-Religious Reform Movements',
        ],
      },
      {
        name: 'Indian Freedom Struggle',
        subtopics: [
          'Indian National Congress',
          'Non-Cooperation Movement',
          'Civil Disobedience Movement',
          'Quit India Movement',
        ],
      },
    ],
  },
  {
    name: 'Geography',
    description:
      'Physical and economic geography of India, Kerala and the world',
    topics: [
      {
        name: 'Physical Geography of India',
        subtopics: [
          'The Himalayas',
          'Peninsular Plateau',
          'Rivers of India',
          'Climate of India',
        ],
      },
      {
        name: 'Geography of Kerala',
        subtopics: [
          'Districts of Kerala',
          'Rivers of Kerala',
          'Backwaters of Kerala',
          'Western Ghats',
        ],
      },
      {
        name: 'World Geography',
        subtopics: ['Continents and Oceans', 'Latitudes and Longitudes'],
      },
    ],
  },
  {
    name: 'Economics',
    description: 'Indian economy, banking and the major economic schemes',
    topics: [
      {
        name: 'Indian Economy',
        subtopics: ['Five Year Plans', 'NITI Aayog', 'GDP and National Income'],
      },
      {
        name: 'Banking and Finance',
        subtopics: ['Reserve Bank of India', 'Union Budget', 'GST'],
      },
      {
        name: 'Economic Schemes',
        subtopics: [
          'MGNREGA',
          'Pradhan Mantri Jan Dhan Yojana',
          'Ayushman Bharat',
        ],
      },
    ],
  },
  {
    name: 'General Science',
    description: 'Everyday physics, chemistry and life sciences',
    topics: [
      {
        name: 'Physics',
        subtopics: [
          'Units and Measurements',
          'Laws of Motion',
          'Light and Optics',
        ],
      },
      {
        name: 'Chemistry',
        subtopics: [
          'Periodic Table',
          'Acids, Bases and Salts',
          'Metals and Non-metals',
        ],
      },
      {
        name: 'Biology',
        subtopics: [
          'Human Body Systems',
          'Vitamins and Deficiency Diseases',
          'Genetics',
        ],
      },
    ],
  },
  {
    name: 'Current Affairs',
    description: 'National and international events of the last twelve months',
    topics: [
      { name: 'National Affairs' },
      { name: 'Kerala Affairs' },
      { name: 'International Affairs' },
      { name: 'Sports' },
      { name: 'Awards and Honours' },
    ],
  },
  {
    name: 'General English',
    description: 'Grammar, vocabulary and comprehension',
    topics: [
      {
        name: 'Grammar',
        subtopics: [
          'Tenses',
          'Articles',
          'Prepositions',
          'Active and Passive Voice',
          'Reported Speech',
        ],
      },
      {
        name: 'Vocabulary',
        subtopics: [
          'Synonyms',
          'Antonyms',
          'One Word Substitution',
          'Idioms and Phrases',
        ],
      },
      { name: 'Comprehension' },
    ],
  },
  {
    name: 'Malayalam',
    description: 'Malayalam grammar, usage and translation',
    topics: [
      {
        name: 'Malayalam Grammar',
        subtopics: ['Sandhi', 'Samasam', 'Padasudhi'],
      },
      {
        name: 'Translation',
        subtopics: ['English to Malayalam', 'Malayalam to English'],
      },
      { name: 'Malayalam Literature' },
    ],
  },
  {
    name: 'Arithmetic',
    description: 'Quantitative aptitude for the objective papers',
    topics: [
      {
        name: 'Number System',
        subtopics: ['HCF and LCM', 'Fractions', 'Simplification'],
      },
      {
        name: 'Percentage and Ratio',
        subtopics: ['Percentage', 'Ratio and Proportion', 'Profit and Loss'],
      },
      {
        name: 'Time and Work',
        subtopics: ['Time and Work', 'Time, Speed and Distance'],
      },
      { name: 'Mensuration', subtopics: ['Area and Perimeter', 'Volume'] },
      {
        name: 'Interest',
        subtopics: ['Simple Interest', 'Compound Interest'],
      },
    ],
  },
  {
    name: 'Reasoning',
    description: 'Verbal and non-verbal reasoning',
    topics: [
      {
        name: 'Verbal Reasoning',
        subtopics: [
          'Series',
          'Analogy',
          'Coding and Decoding',
          'Blood Relations',
          'Direction Sense',
        ],
      },
      {
        name: 'Non-Verbal Reasoning',
        subtopics: ['Figure Series', 'Mirror and Water Images'],
      },
    ],
  },
  {
    name: 'Mental Ability',
    description: 'Logical ability and data interpretation',
    topics: [
      {
        name: 'Logical Ability',
        subtopics: ['Odd One Out', 'Ranking and Ordering'],
      },
      { name: 'Data Interpretation', subtopics: ['Tables and Charts'] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Syllabus mappings - the same academic rows reused across seven stages
// ---------------------------------------------------------------------------

interface ItemSeed {
  subject: string;
  topic?: string;
  subtopic?: string;
  priority: SyllabusPriority;
  /** Questions expected from this item. Left off for emphasis-only rows. */
  weight?: number;
}

interface SyllabusSeed {
  exam: string;
  stage: string;
  title: string;
  items: ItemSeed[];
}

const H = SyllabusPriority.High;
const M = SyllabusPriority.Medium;
const L = SyllabusPriority.Low;

const SYLLABI: SyllabusSeed[] = [
  {
    exam: 'Sub Inspector of Police',
    stage: 'Preliminary Examination',
    title: 'SI of Police - Preliminary Examination',
    items: [
      { subject: 'Current Affairs', priority: H, weight: 15 },
      { subject: 'Indian Constitution', priority: H, weight: 12 },
      { subject: 'Kerala History', priority: H, weight: 12 },
      { subject: 'Indian History', priority: M, weight: 10 },
      { subject: 'Geography', priority: M, weight: 10 },
      { subject: 'General Science', priority: M, weight: 10 },
      { subject: 'Arithmetic', priority: M, weight: 10 },
      { subject: 'Reasoning', priority: M, weight: 8 },
      { subject: 'Mental Ability', priority: M, weight: 7 },
      { subject: 'Economics', priority: L, weight: 6 },
      // Emphasis inside a subject that is already mapped in full. No weight
      // of their own - they narrow attention, they do not add questions.
      {
        subject: 'Indian Constitution',
        topic: 'Fundamental Rights',
        priority: H,
      },
      {
        subject: 'Indian Constitution',
        topic: 'Fundamental Rights',
        subtopic: 'Article 21',
        priority: H,
      },
      { subject: 'Kerala History', topic: 'Kerala Renaissance', priority: H },
    ],
  },
  {
    exam: 'Sub Inspector of Police',
    stage: 'Main Examination',
    title: 'SI of Police - Main Examination',
    items: [
      { subject: 'Indian Constitution', priority: H, weight: 15 },
      { subject: 'Current Affairs', priority: H, weight: 15 },
      { subject: 'Kerala History', priority: M, weight: 10 },
      { subject: 'Indian History', priority: M, weight: 10 },
      { subject: 'General Science', priority: M, weight: 10 },
      { subject: 'General English', priority: M, weight: 10 },
      { subject: 'Geography', priority: M, weight: 8 },
      { subject: 'Arithmetic', priority: M, weight: 8 },
      { subject: 'Economics', priority: M, weight: 7 },
      { subject: 'Reasoning', priority: M, weight: 7 },
      { subject: 'Indian Constitution', topic: 'Judiciary', priority: H },
      { subject: 'Indian Constitution', topic: 'Parliament', priority: H },
    ],
  },
  {
    exam: 'Lower Division Clerk',
    stage: 'Main Examination',
    title: 'LDC - Main Examination',
    items: [
      { subject: 'Arithmetic', priority: H, weight: 15 },
      { subject: 'Current Affairs', priority: H, weight: 12 },
      { subject: 'Kerala History', priority: H, weight: 10 },
      { subject: 'General Science', priority: M, weight: 10 },
      { subject: 'Mental Ability', priority: M, weight: 10 },
      { subject: 'Indian History', priority: M, weight: 8 },
      { subject: 'Geography', priority: M, weight: 8 },
      { subject: 'Indian Constitution', priority: M, weight: 8 },
      { subject: 'Economics', priority: L, weight: 5 },
      { subject: 'General English', priority: L, weight: 5 },
      { subject: 'Malayalam', priority: L, weight: 5 },
      { subject: 'Reasoning', priority: L, weight: 4 },
    ],
  },
  {
    exam: 'Secretariat Assistant',
    stage: 'Preliminary Examination',
    title: 'Secretariat Assistant - Preliminary Examination',
    items: [
      { subject: 'Current Affairs', priority: H, weight: 15 },
      { subject: 'Kerala History', priority: H, weight: 12 },
      { subject: 'Indian Constitution', priority: H, weight: 10 },
      { subject: 'Indian History', priority: M, weight: 10 },
      { subject: 'Geography', priority: M, weight: 10 },
      { subject: 'General Science', priority: M, weight: 10 },
      { subject: 'Arithmetic', priority: M, weight: 10 },
      { subject: 'Economics', priority: M, weight: 8 },
      { subject: 'Reasoning', priority: M, weight: 8 },
      { subject: 'General English', priority: L, weight: 7 },
    ],
  },
  {
    exam: 'University Assistant',
    stage: 'Main Examination',
    title: 'University Assistant - Main Examination',
    items: [
      { subject: 'Current Affairs', priority: H, weight: 15 },
      { subject: 'Indian Constitution', priority: H, weight: 10 },
      { subject: 'Kerala History', priority: H, weight: 10 },
      { subject: 'General Science', priority: M, weight: 10 },
      { subject: 'Arithmetic', priority: M, weight: 10 },
      { subject: 'General English', priority: M, weight: 10 },
      { subject: 'Indian History', priority: M, weight: 8 },
      { subject: 'Geography', priority: M, weight: 8 },
      { subject: 'Reasoning', priority: M, weight: 8 },
      { subject: 'Economics', priority: L, weight: 6 },
      { subject: 'Mental Ability', priority: L, weight: 5 },
    ],
  },
  {
    exam: 'Civil Police Officer',
    stage: 'Main Examination',
    title: 'Civil Police Officer - Main Examination',
    items: [
      { subject: 'Current Affairs', priority: H, weight: 13 },
      { subject: 'Kerala History', priority: H, weight: 12 },
      { subject: 'General Science', priority: M, weight: 12 },
      { subject: 'Arithmetic', priority: M, weight: 12 },
      { subject: 'Indian History', priority: M, weight: 10 },
      { subject: 'Geography', priority: M, weight: 10 },
      { subject: 'Indian Constitution', priority: M, weight: 10 },
      { subject: 'Mental Ability', priority: M, weight: 10 },
      { subject: 'General English', priority: L, weight: 6 },
      { subject: 'Economics', priority: L, weight: 5 },
    ],
  },
  {
    exam: 'Kerala Administrative Service',
    stage: 'Preliminary Examination',
    title: 'KAS - Preliminary Examination',
    items: [
      { subject: 'Current Affairs', priority: H, weight: 18 },
      { subject: 'Indian Constitution', priority: H, weight: 15 },
      { subject: 'Kerala History', priority: H, weight: 15 },
      { subject: 'Economics', priority: H, weight: 12 },
      { subject: 'Indian History', priority: M, weight: 10 },
      { subject: 'Geography', priority: M, weight: 10 },
      { subject: 'General Science', priority: M, weight: 10 },
      { subject: 'Mental Ability', priority: M, weight: 10 },
      { subject: 'Indian Constitution', topic: 'Parliament', priority: H },
      { subject: 'Indian Constitution', topic: 'Judiciary', priority: H },
      {
        subject: 'Indian Constitution',
        topic: 'Constitutional Amendments',
        priority: H,
      },
      {
        subject: 'Indian Constitution',
        topic: 'Fundamental Rights',
        subtopic: 'Article 32',
        priority: H,
      },
    ],
  },
];

// ---------------------------------------------------------------------------

const stats = { created: 0, skipped: 0 };

function note(created: boolean, label: string) {
  if (created) {
    stats.created++;
    console.log(`  + ${label}`);
  } else {
    stats.skipped++;
  }
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const examLevels = app.get(ExamLevelsService);
    const examPosts = app.get(ExamPostsService);
    const examStages = app.get(ExamStagesService);
    const subjects = app.get(SubjectsService);
    const topics = app.get(TopicsService);
    const subtopics = app.get(SubtopicsService);
    const syllabi = app.get(SyllabusService);

    // Stamp the audit columns with a real admin when there is one.
    const admin = await app
      .get(DataSource)
      .getRepository(User)
      .findOne({ where: { role: Role.Admin }, order: { id: 'ASC' } });
    const actorId = admin?.id;
    console.log(
      admin
        ? `Seeding as admin ${admin.email} (id ${admin.id})`
        : 'No admin found - audit columns will be left empty',
    );

    console.log('\nExam levels');
    const levelIds = new Map<string, number>();
    for (const level of EXAM_LEVELS) {
      const existing = (await examLevels.findAll({ search: level.name })).find(
        (row) => row.name === level.name,
      );
      const row = existing ?? (await examLevels.create(level, actorId));
      levelIds.set(row.name, row.id);
      note(!existing, `exam level "${row.name}"`);
    }

    console.log('\nExams and stages');
    const examIds = new Map<string, number>();
    const stageIds = new Map<string, number>();
    for (const group of EXAMS) {
      const examLevelId = levelIds.get(group.level)!;

      for (const exam of group.exams) {
        const existingExam = (await examPosts.findAll({ examLevelId })).find(
          (row) => row.name === exam.name,
        );
        const examRow =
          existingExam ??
          (await examPosts.create(
            {
              examLevelId,
              name: exam.name,
              shortName: exam.shortName,
              department: exam.department,
              qualification: exam.qualification,
              sortOrder: group.exams.indexOf(exam) + 1,
            },
            actorId,
          ));
        examIds.set(exam.name, examRow.id);
        note(!existingExam, `exam "${exam.name}" (${group.level})`);

        for (const [index, stage] of exam.stages.entries()) {
          const existingStage = (
            await examStages.findAll({ examId: examRow.id })
          ).find((row) => row.name === stage.name);
          const stageRow =
            existingStage ??
            (await examStages.create(
              { examId: examRow.id, ...stage, stageOrder: index + 1 },
              actorId,
            ));
          stageIds.set(`${exam.name}::${stage.name}`, stageRow.id);
          note(!existingStage, `stage "${exam.name} / ${stage.name}"`);
        }
      }
    }

    console.log('\nSubjects, topics and subtopics');
    const subjectIds = new Map<string, number>();
    const topicIds = new Map<string, number>();
    const subtopicIds = new Map<string, number>();
    for (const [subjectIndex, subject] of SUBJECTS.entries()) {
      const existingSubject = (
        await subjects.findAll({ search: subject.name })
      ).find((row) => row.name === subject.name);
      const subjectRow =
        existingSubject ??
        (await subjects.create(
          {
            name: subject.name,
            description: subject.description,
            sortOrder: subjectIndex + 1,
          },
          actorId,
        ));
      subjectIds.set(subject.name, subjectRow.id);
      note(!existingSubject, `subject "${subject.name}"`);

      for (const [topicIndex, topic] of subject.topics.entries()) {
        const existingTopic = (
          await topics.findAll({ subjectId: subjectRow.id })
        ).find((row) => row.name === topic.name);
        const topicRow =
          existingTopic ??
          (await topics.create(
            {
              subjectId: subjectRow.id,
              name: topic.name,
              sortOrder: topicIndex + 1,
            },
            actorId,
          ));
        topicIds.set(`${subject.name}::${topic.name}`, topicRow.id);
        note(!existingTopic, `topic "${subject.name} / ${topic.name}"`);

        for (const [subIndex, subtopic] of (topic.subtopics ?? []).entries()) {
          const existingSubtopic = (
            await subtopics.findAll({ topicId: topicRow.id })
          ).find((row) => row.name === subtopic);
          const subtopicRow =
            existingSubtopic ??
            (await subtopics.create(
              {
                topicId: topicRow.id,
                name: subtopic,
                sortOrder: subIndex + 1,
              },
              actorId,
            ));
          subtopicIds.set(
            `${subject.name}::${topic.name}::${subtopic}`,
            subtopicRow.id,
          );
          note(!existingSubtopic, `subtopic "${topic.name} / ${subtopic}"`);
        }
      }
    }

    console.log('\nSyllabus mappings');
    for (const plan of SYLLABI) {
      const examId = examIds.get(plan.exam)!;
      const examStageId = stageIds.get(`${plan.exam}::${plan.stage}`)!;

      let syllabus: ExamSyllabus;
      try {
        syllabus = await syllabi.findByStage(examStageId);
        stats.skipped++;
      } catch (err) {
        if (!(err instanceof NotFoundException)) throw err;
        syllabus = await syllabi.create(
          { examId, examStageId, title: plan.title },
          actorId,
        );
        note(true, `syllabus "${plan.title}"`);
      }

      let added = 0;
      for (const [index, item] of plan.items.entries()) {
        const topicId = item.topic
          ? topicIds.get(`${item.subject}::${item.topic}`)
          : undefined;
        const subtopicId =
          item.topic && item.subtopic
            ? subtopicIds.get(
                `${item.subject}::${item.topic}::${item.subtopic}`,
              )
            : undefined;

        try {
          await syllabi.addItem(
            syllabus.id,
            {
              subjectId: subjectIds.get(item.subject)!,
              topicId,
              subtopicId,
              priority: item.priority,
              marksWeightage: item.weight,
              questionWeightage: item.weight,
              sortOrder: index + 1,
            },
            actorId,
          );
          added++;
          stats.created++;
        } catch (err) {
          if (!(err instanceof ConflictException)) throw err;
          stats.skipped++;
        }
      }
      if (added > 0) console.log(`  + ${added} item(s) in "${plan.title}"`);
    }

    console.log(
      `\nDone. ${stats.created} record(s) created, ${stats.skipped} already present.`,
    );
  } finally {
    await app.close();
  }
}

seed().catch((err) => {
  console.error(
    'Exam and syllabus seed failed:',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
