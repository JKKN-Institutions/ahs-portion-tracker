-- Add Assessment Results Table (Student Marks)
CREATE TABLE assessment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES internal_assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2) NOT NULL DEFAULT 0,
    max_marks DECIMAL(5,2) NOT NULL DEFAULT 20,
    remarks TEXT,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(assessment_id, student_id)
);

-- Create indexes
CREATE INDEX idx_assessment_results_assessment ON assessment_results(assessment_id);
CREATE INDEX idx_assessment_results_student ON assessment_results(student_id);
CREATE INDEX idx_assessment_results_graded_by ON assessment_results(graded_by);

-- Enable RLS
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

-- Students can view their own results
CREATE POLICY "Students can view their own results"
ON assessment_results FOR SELECT
USING (student_id = auth.uid());

-- Facilitators can view results for their assessments
CREATE POLICY "Facilitators can view results for their assessments"
ON assessment_results FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM internal_assessments ia
        JOIN subjects s ON s.id = ia.subject_id
        WHERE ia.id = assessment_results.assessment_id
        AND s.facilitator_id = auth.uid()
    )
);

-- Facilitators can insert results for their assessments
CREATE POLICY "Facilitators can insert results"
ON assessment_results FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM internal_assessments ia
        JOIN subjects s ON s.id = ia.subject_id
        WHERE ia.id = assessment_results.assessment_id
        AND s.facilitator_id = auth.uid()
    )
);

-- Facilitators can update results for their assessments
CREATE POLICY "Facilitators can update results"
ON assessment_results FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM internal_assessments ia
        JOIN subjects s ON s.id = ia.subject_id
        WHERE ia.id = assessment_results.assessment_id
        AND s.facilitator_id = auth.uid()
    )
);

-- Admins can do everything
CREATE POLICY "Admins can manage all results"
ON assessment_results FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
    )
);

-- Add updated_at trigger
CREATE TRIGGER update_assessment_results_updated_at
    BEFORE UPDATE ON assessment_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
