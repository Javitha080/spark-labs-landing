-- Add Contact Content to content_blocks
INSERT INTO public.content_blocks (page_name, section_name, block_key, content_value, usage_description)
VALUES
    ('landing_page', 'contact', 'heading_main', 'get in touch', 'Main section heading'),
    ('landing_page', 'contact', 'heading_sub', 'have questions? we''d love to hear from you. send us a message!', 'Subtitle below heading'),
    
    ('landing_page', 'contact', 'card_1_title', 'Visit Us', 'Title for first contact card'),
    ('landing_page', 'contact', 'card_1_detail_1', 'Dharmapala Vidyalaya', 'First line of address'),
    ('landing_page', 'contact', 'card_1_detail_2', 'Silva Place, Pannipitiya 10230', 'Second line of address'),
    
    ('landing_page', 'contact', 'card_2_title', 'Email Us', 'Title for second contact card'),
    ('landing_page', 'contact', 'card_2_detail_1', 'innovators@dharmapala.edu.lk', 'First email address'),
    ('landing_page', 'contact', 'card_2_detail_2', 'General Inquiries', 'Use/Description for email'),
    
    ('landing_page', 'contact', 'card_3_title', 'Call Us', 'Title for third contact card'),
    ('landing_page', 'contact', 'card_3_detail_1', '+94 XX XXX XXXX', 'Phone number'),
    ('landing_page', 'contact', 'card_3_detail_2', 'Mon - Fri, 9AM - 4PM', 'Availability hours')
ON CONFLICT (page_name, section_name, block_key) DO NOTHING;
