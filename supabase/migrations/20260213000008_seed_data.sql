-- Seed Data for Learning Hub (Udemy-like Structure)

-- 1. Insert a Sample Course
INSERT INTO public.learning_courses (id, title, slug, description, category, level, content_type, instructor, duration, is_published, created_at, updated_at)
VALUES 
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Fixed ID for reference
  'Full Stack Web Development Bootcamp',
  'full-stack-web-development',
  'Master modern web development with this comprehensive course covering React, Node.js, and Supabase. Perfect for beginners and intermediate developers.',
  'Development',
  'beginner',
  'video',
  'Spark Labs Team',
  '12 hours',
  true,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Sections for the Course
INSERT INTO public.learning_sections (id, course_id, title, display_order, is_published)
VALUES 
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Module 1: Getting Started', 0, true),
('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Module 2: React Fundamentals', 1, true),
('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Module 3: Backend with Supabase', 2, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Modules (Lessons) for Section 1
INSERT INTO public.learning_modules (course_id, section_id, title, description, content_type, duration_minutes, display_order, is_published)
VALUES
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
  'Course Introduction',
  '<p>Welcome to the <strong>Full Stack Web Development Bootcamp</strong>! In this video, we will overview what you will learn.</p>',
  'video',
  5,
  0,
  true
),
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
  'Setting Up Your Environment',
  '<p>Learn how to install <code>Node.js</code>, <code>VS Code</code>, and <code>Git</code>.</p><ul><li>Download VS Code</li><li>Install Node.js LTS</li></ul>',
  'article',
  15,
  1,
  true
);

-- 4. Insert Modules (Lessons) for Section 2
INSERT INTO public.learning_modules (course_id, section_id, title, description, content_type, duration_minutes, display_order, is_published)
VALUES
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
  'Understanding Components',
  '<p>Components are the building blocks of React applications.</p>',
  'video',
  20,
  0,
  true
),
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
  'Props and State',
  '<p>Deep dive into data management in React.</p>',
  'video',
  25,
  1,
  true
);

-- 5. Insert Modules (Lessons) for Section 3
INSERT INTO public.learning_modules (course_id, section_id, title, description, content_type, duration_minutes, display_order, is_published)
VALUES
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44',
  'Database Design',
  '<p>How to structure your SQL database.</p>',
  'video',
  30,
  0,
  true
);
