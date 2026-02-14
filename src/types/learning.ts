export type Course = {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    category: string | null;
    level: string | null;
    content_type: string | null;
    content_url: string | null;
    thumbnail_url: string | null;
    instructor: string | null;
    instructor_bio: string | null;
    instructor_avatar: string | null;
    duration: string | null;
    skills: string[] | null;
    learning_outcomes: string[] | null;
    prerequisites: string[] | null;
    language: string | null;
    is_featured: boolean | null;
    is_published: boolean | null;
    display_order: number | null;
    view_count: number | null;
    rating_avg: number | null;
    rating_count: number | null;
    enrolled_count: number | null;
    last_updated: string | null;
    created_at: string;
    updated_at: string;
};

export type Section = {
    id: string;
    course_id: string;
    title: string;
    description: string | null;
    display_order: number | null;
    is_published: boolean | null;
    created_at: string;
    updated_at: string;
    // Relationships
    modules?: Module[];
};

export interface Enrollment {
    id: string;
    user_id: string;
    course_id: string;
    enrolled_at: string;
    completed_at: string | null;
    progress: number;
}

export interface UserProgress {
    id: string;
    user_id: string;
    course_id: string;
    module_id: string;
    is_completed: boolean;
    completed_at: string | null;
    last_position: number;
}

export type Module = {
    id: string;
    course_id: string;
    section_id: string | null;
    title: string;
    description: string | null;
    content_type: string | null; // 'video' | 'text' | 'quiz'
    content_url: string | null;
    duration_minutes: number | null;
    display_order: number | null;
    is_published: boolean | null;
    created_at: string;
    updated_at: string;
};

export type Workshop = {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    workshop_date: string | null;
    workshop_time: string | null;
    location: string | null;
    max_capacity: number | null;
    materials: string | null;
    instructor: string | null;
    category: string | null;
    is_featured: boolean | null;
    is_published: boolean | null;
    registration_url: string | null;
    created_at: string;
    updated_at: string;
};

export type Resource = {
    id: string;
    title: string;
    description: string | null;
    resource_type: string | null;
    url: string | null;
    icon: string | null;
    display_order: number | null;
    is_published: boolean | null;
    created_at: string;
    updated_at: string;
};

export type Review = {
    id: string;
    user_id: string;
    course_id: string;
    rating: number;
    review_text: string | null;
    is_approved: boolean;
    created_at: string;
    updated_at: string;
    // Joined fields
    user_name?: string;
    user_avatar?: string;
};
