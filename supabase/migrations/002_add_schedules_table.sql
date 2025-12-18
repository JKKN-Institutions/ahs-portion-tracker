-- Add Class Schedules Table
CREATE TABLE class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create indexes
CREATE INDEX idx_schedules_subject ON class_schedules(subject_id);
CREATE INDEX idx_schedules_day ON class_schedules(day_of_week);

-- Enable RLS
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_schedules

-- Facilitators can view schedules for their subjects
CREATE POLICY "Facilitators can view their schedules"
ON class_schedules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = class_schedules.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

-- Facilitators can manage schedules for their subjects
CREATE POLICY "Facilitators can manage their schedules"
ON class_schedules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = class_schedules.subject_id
        AND s.facilitator_id = auth.uid()
    )
);

-- Admins can view all schedules
CREATE POLICY "Admins can view all schedules"
ON class_schedules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- Admins can manage all schedules
CREATE POLICY "Admins can manage all schedules"
ON class_schedules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- HODs can view schedules in their department
CREATE POLICY "HODs can view schedules in their department"
ON class_schedules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM subjects s
        JOIN users u ON u.id = auth.uid()
        WHERE s.id = class_schedules.subject_id
        AND u.role = 'hod'
        AND u.department_id = s.department_id
    )
);

-- Add updated_at trigger
CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON class_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
