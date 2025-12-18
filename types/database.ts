// Database Types for Academic Portion Completion Tracking System

export type UserRole = 'super_admin' | 'admin' | 'facilitator' | 'learner';

export type ProjectType = 'case_study' | 'seminar' | 'reportage';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department_id: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hod_id: string | null;
  created_at: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  department_id: string;
  academic_year_id: string;
  facilitator_id: string;
  created_at: string;
}

export interface Portion {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  sequence_order: number;
  planned_date: string;
  completed_date: string | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LessonPlan {
  id: string;
  subject_id: string;
  file_url: string;
  file_name: string;
  version: number;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface InternalAssessment {
  id: string;
  subject_id: string;
  ia_number: number;
  scheduled_date: string;
  conducted_date: string | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  subject_id: string;
  type: ProjectType;
  title: string;
  description: string | null;
  assigned_date: string;
  due_date: string;
  is_completed: boolean;
  completed_date: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// Extended types with relations
export interface SubjectWithRelations extends Subject {
  department?: Department;
  facilitator?: User;
  portions?: Portion[];
  academic_year?: AcademicYear;
}

export interface PortionWithSubject extends Portion {
  subject?: SubjectWithRelations;
}

export interface DepartmentWithStats extends Department {
  total_portions: number;
  completed_portions: number;
  completion_percentage: number;
  facilitator_count: number;
  subject_count: number;
}

export interface FacilitatorStats {
  total_portions: number;
  completed_portions: number;
  pending_portions: number;
  overdue_portions: number;
  completion_percentage: number;
}

export interface AdminStats {
  total_departments: number;
  total_facilitators: number;
  total_subjects: number;
  total_portions: number;
  completed_portions: number;
  overdue_portions: number;
  completion_percentage: number;
}

// Learner-specific types
export interface LearnerEnrollment {
  id: string;
  learner_id: string;
  subject_id: string;
  academic_year_id: string;
  enrolled_at: string;
}

export interface LearnerGrade {
  id: string;
  learner_id: string;
  subject_id: string;
  assessment_type: 'ia1' | 'ia2' | 'ia3' | 'assignment' | 'project' | 'final';
  marks_obtained: number;
  max_marks: number;
  graded_at: string;
  remarks: string | null;
}

export interface ClassSchedule {
  id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  department_id: string | null;
  subject_id: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface LearnerStats {
  total_subjects: number;
  total_portions: number;
  completed_portions: number;
  completion_percentage: number;
  upcoming_assessments: number;
  pending_assignments: number;
}

// Learner Assessment Marks for leaderboard
export interface LearnerAssessmentMark {
  id: string;
  assessment_id: string;
  learner_id: string;
  marks_obtained: number;
  max_marks: number;
  paper_url: string | null;
  paper_file_name: string | null;
  submitted_at: string;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  remarks: string | null;
}

export interface LearnerAssessmentMarkWithDetails extends LearnerAssessmentMark {
  learner?: User;
  assessment?: InternalAssessment & {
    subject?: Subject;
  };
}

// User Departments - for facilitators with multiple departments
export interface UserDepartment {
  id: string;
  user_id: string;
  department_id: string;
  created_at: string;
}

export interface UserWithDepartments extends User {
  departments?: Department[];
}
