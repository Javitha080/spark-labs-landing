-- Add Impact Stats to content_blocks
INSERT INTO public.content_blocks (page_name, section_name, block_key, content_value, usage_description)
VALUES
    ('landing_page', 'impact_stats', 'stat_1_value', '320K', 'Value for first stat (e.g. Lines of Code)'),
    ('landing_page', 'impact_stats', 'stat_1_label', 'Lines of Code', 'Label for first stat'),
    ('landing_page', 'impact_stats', 'stat_2_value', '7+', 'Value for second stat (e.g. Members)'),
    ('landing_page', 'impact_stats', 'stat_2_label', 'Members', 'Label for second stat'),
    ('landing_page', 'impact_stats', 'stat_3_value', '1+', 'Value for third stat (e.g. Projects)'),
    ('landing_page', 'impact_stats', 'stat_3_label', 'Projects', 'Label for third stat'),
    ('landing_page', 'impact_stats', 'stat_4_value', '15+', 'Value for fourth stat (e.g. Awards)'),
    ('landing_page', 'impact_stats', 'stat_4_label', 'Awards', 'Label for fourth stat')
ON CONFLICT (page_name, section_name, block_key) DO NOTHING;
