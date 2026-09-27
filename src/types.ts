export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Lesson {
  id?: string | number;
  title: string;
  content: string;
  duration: string;
  quiz: QuizQuestion[];
  videoUrl?: string;
}

export interface CourseModule {
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: "Front-end" | "Back-end" | "Data Science" | "UX & Design" | "Mobile" | string;
  duration: string;
  modules: CourseModule[];
  isCustom?: boolean;
  instructor?: string;
  level?: string;
  icon?: string;
  imageUrl?: string;
  gradientColor?: string;
  visibility?: "Público" | "Privado" | "Rascunho" | string;
  lessonsCount?: number | string;
  id_trilha?: number | string | null;
}

export interface Trilha {
  id: number | string;
  nome_da_trilha: string;
  descricao?: string;
  gradient_color?: string;
  criado_em?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface StudentStats {
  completedLessons: string[]; // List of unique courseId-moduleIndex-lessonIndex strings
  completedCourses: string[]; // List of courseIds
  streak: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  name: string;
}

export interface ProjectFile {
  name: string;
  language: "html" | "css" | "js";
  content: string;
}

export interface CodeProject {
  id: string;
  title: string;
  description: string;
  courseTag: string;
  files: ProjectFile[];
  activeFileName: string;
  createdAt: string;
  updatedAt: string;
  id_trilha?: number | string | null;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  techStack: string[];
  status: "Planejamento" | "Em Desenvolvimento" | "Concluído";
  repoUrl?: string;
  demoUrl?: string;
  createdAt: string;
  updatedAt: string;
}
