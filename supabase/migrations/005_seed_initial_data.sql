-- Seed initial data for the system
-- This script creates an active academic year and ensures departments exist

-- Create active academic year for 2024-2025
INSERT INTO academic_years (name, start_date, end_date, is_active)
VALUES ('2024-2025', '2024-06-01', '2025-05-31', true)
ON CONFLICT DO NOTHING;

-- Ensure departments exist (from previous migration)
INSERT INTO departments (name, code) VALUES
    ('B.Sc - Cardiac Technology', 'BSC-CT'),
    ('B.Sc - Dialysis Technology', 'BSC-DT'),
    ('B.Sc - Physician Assistant', 'BSC-PA'),
    ('B.Sc - Respiratory Therapy', 'BSC-RT'),
    ('B.Sc - Medical Record Science', 'BSC-MRS'),
    ('B.Sc - Critical Care Technology', 'BSC-CCT'),
    ('B.Sc - Accident and Emergency Care Technology', 'BSC-AECT'),
    ('B.Sc - Radiology Imaging Technology', 'BSC-RIT'),
    ('B.Sc - Operation Theatre & Anaesthesia Technology', 'BSC-OTAT')
ON CONFLICT (code) DO NOTHING;
