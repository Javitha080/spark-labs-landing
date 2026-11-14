-- Add Hero Content to content_blocks
INSERT INTO public.content_blocks (page_name, section_name, block_key, content_value, usage_description)
VALUES
    ('landing_page', 'hero', 'badge_text', 'young innovators club • est 2020', 'Top badge text'),
    ('landing_page', 'hero', 'main_heading', 'yicdvp', 'Main large heading text'),
    ('landing_page', 'hero', 'sub_heading', 'Innovate. Create. Disrupt.', 'Subtitle below main heading'),
    ('landing_page', 'hero', 'description', 'Empowering the next generation of tech leaders at Dharmapala Vidyalaya Pannipitiya.', 'Description text'),
    ('landing_page', 'hero', 'cta_primary', 'Join the Club', 'Primary button text'),
    ('landing_page', 'hero', 'cta_secondary', 'Our Projects', 'Secondary button text'),
    ('landing_page', 'hero', 'stat_awards_label', 'Awards', 'Label for the 3rd stat block'),
    ('landing_page', 'hero', 'stat_awards_value', '15', 'Initial value for Awards stat (can be overridden by dynamic content if needed)')
ON CONFLICT (page_name, section_name, block_key) DO NOTHING;
