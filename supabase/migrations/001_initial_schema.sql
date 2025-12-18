-- Academic Portion Completion Tracking System
-- Initial Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'hod', 'facilitator', 'viewer');
CREATE TYPE project_type AS ENUM ('case_study', 'seminar', 'reportage');
CREATE TYPE lesson_plan_status AS ENUM ('pending', 'approved', 'rejected');

-- Academic Years Table
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Departments Table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    hod_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'facilitator',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign key for HOD in departments (after users table is created)
ALTER TABLE departments
ADD CONSTRAINT fk_departments_hod
FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL;

-- Subjects Table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    facilitator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(code, academic_year_id)
);

-- Portions Table
CREATE TABLE portions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL,
    planned_date DATE NOT NULL,
    completed_date DATE,
    is_completed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Lesson Plans Table
CREATE TABLE lesson_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    status lesson_plan_status DEFAULT 'pending',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Internal Assessments Table
CREATE TABLE internal_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    ia_number INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    conducted_date DATE,
    is_completed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, ia_number)
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    type project_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_date DATE NOT NULL,
    due_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Log Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_subjects_department ON subjects(department_id);
CREATE INDEX idx_subjects_facilitator ON subjects(facilitator_id);
CREATE INDEX idx_subjects_academic_year ON subjects(academic_year_id);
CREATE INDEX idx_portions_subject ON portions(subject_id);
CREATE INDEX idx_portions_planned_date ON portions(planned_date);
CREATE INDEX idx_portions_is_completed ON portions(is_completed);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

CREATE POLICY "HODs can view users in their department"
ON users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'hod'
        AND u.department_id = users.department_id
    )
);

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can manage all users"
ON users FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
    )
);

-- Departments policies
CREATE POLICY "Anyone can view departments"
ON departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage departments"
ON departments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- Academic years policies
CREATE POLICY "Anyone can view academic years"
ON academic_years FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage academic years"
ON academic_years FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- Subjects policies
CREATE POLICY "Facilitators can view their own subjects"
ON subjects FOR SELECT
USING (facilitator_id = auth.uid());

CREATE POLICY "Admins can view all subjects"
ON subjects FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

CREATE POLICY "HODs can view subjects in their department"
ON subjects FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'hod'
        AND u.department_id = subjects.department_id
    )
);

CREATE POLICY "Admins can manage subjects"
ON subjects FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- Portions policies
CREATE POLICY "Facilitators can view portions of their subjects"
ON portions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = portions.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

CREATE POLICY "Facilitators can update portions of their subjects"
ON portions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = portions.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all portions"
ON portions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

CREATE POLICY "Admins can manage all portions"
ON portions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- HODs can view portions in their department
CREATE POLICY "HODs can view portions in their department"
ON portions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        JOIN users u ON u.id = auth.uid()
        WHERE s.id = portions.subject_id
        AND u.role = 'hod'
        AND u.department_id = s.department_id
    )
);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- Audit logs policies (only admins can view)
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- Lesson plans policies
CREATE POLICY "Facilitators can view their lesson plans"
ON lesson_plans FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = lesson_plans.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

CREATE POLICY "Facilitators can manage their lesson plans"
ON lesson_plans FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = lesson_plans.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all lesson plans"
ON lesson_plans FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- Internal assessments policies
CREATE POLICY "Facilitators can view their IAs"
ON internal_assessments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = internal_assessments.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

CREATE POLICY "Facilitators can manage their IAs"
ON internal_assessments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = internal_assessments.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all IAs"
ON internal_assessments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- Projects policies
CREATE POLICY "Facilitators can view their projects"
ON projects FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = projects.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

CREATE POLICY "Facilitators can manage their projects"
ON projects FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = projects.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all projects"
ON projects FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'facilitator')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portions_updated_at
    BEFORE UPDATE ON portions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert academic years
INSERT INTO academic_years (name, start_date, end_date, is_active)
VALUES
    ('2022-2023', '2022-07-01', '2023-05-31', false),
    ('2023-2024', '2023-07-01', '2024-05-31', false),
    ('2024-2025', '2024-07-01', '2025-05-31', true),
    ('2025-2026', '2025-07-01', '2026-05-31', false),
    ('2026-2027', '2026-07-01', '2027-05-31', false);
