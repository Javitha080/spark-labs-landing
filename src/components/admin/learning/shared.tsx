export type EnrollmentRow = {
    id: string;
    user_id: string;
    course_id: string;
    enrolled_at: string;
    progress: number | null;
    profiles: { full_name: string | null } | null;
    learning_courses: { title: string; slug: string } | null;
    _learner_email?: string | null;
    _learner_grade?: string | null;
    _is_token_based?: boolean;
};

export type LHContentBlock = {
    id: string;
    section_name: string;
    block_key: string;
    content_value: string;
    image_url: string | null;
    usage_description: string | null;
};
