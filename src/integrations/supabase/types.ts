export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          page_url: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          page_url?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          page_url?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_image_url: string | null
          author_name: string
          category: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          published_at: string | null
          reading_time_minutes: number | null
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          tags: string[] | null
          tech_stack: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_image_url?: string | null
          author_name: string
          category?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          tags?: string[] | null
          tech_stack?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_image_url?: string | null
          author_name?: string
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          tags?: string[] | null
          tech_stack?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          block_key: string
          content_value: string | null
          created_at: string | null
          id: string
          image_url: string | null
          page_name: string
          section_name: string
          updated_at: string | null
          usage_description: string | null
        }
        Insert: {
          block_key: string
          content_value?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          page_name: string
          section_name: string
          updated_at?: string | null
          usage_description?: string | null
        }
        Update: {
          block_key?: string
          content_value?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          page_name?: string
          section_name?: string
          updated_at?: string | null
          usage_description?: string | null
        }
        Relationships: []
      }
      enrollment_notifications: {
        Row: {
          created_at: string | null
          enrollment_id: string
          id: string
          message: string
          sent_at: string | null
          sent_by: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          enrollment_id: string
          id?: string
          message: string
          sent_at?: string | null
          sent_by?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          enrollment_id?: string
          id?: string
          message?: string
          sent_at?: string | null
          sent_by?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_notifications_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_rate_limits: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string
          last_submission_at: string | null
          submission_count: number | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string
          last_submission_at?: string | null
          submission_count?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string
          last_submission_at?: string | null
          submission_count?: number | null
        }
        Relationships: []
      }
      enrollment_submissions: {
        Row: {
          consent_given: boolean
          consent_timestamp: string | null
          created_at: string
          email: string
          grade: string
          id: string
          interest: string
          name: string
          phone: string
          privacy_policy_version: string | null
          reason: string
          status: string | null
        }
        Insert: {
          consent_given?: boolean
          consent_timestamp?: string | null
          created_at?: string
          email: string
          grade: string
          id?: string
          interest: string
          name: string
          phone: string
          privacy_policy_version?: string | null
          reason: string
          status?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_timestamp?: string | null
          created_at?: string
          email?: string
          grade?: string
          id?: string
          interest?: string
          name?: string
          phone?: string
          privacy_policy_version?: string | null
          reason?: string
          status?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          is_featured: boolean | null
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          media_type: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          media_type?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          media_type?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      learner_course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          learner_token_id: string
          progress: number
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          learner_token_id: string
          progress?: number
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          learner_token_id?: string
          progress?: number
        }
        Relationships: [
          {
            foreignKeyName: "learner_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_course_enrollments_learner_token_id_fkey"
            columns: ["learner_token_id"]
            isOneToOne: false
            referencedRelation: "learner_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          is_completed: boolean
          learner_token_id: string
          module_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          is_completed?: boolean
          learner_token_id: string
          module_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          is_completed?: boolean
          learner_token_id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_progress_learner_token_id_fkey"
            columns: ["learner_token_id"]
            isOneToOne: false
            referencedRelation: "learner_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_tokens: {
        Row: {
          browser_fingerprint: string | null
          created_at: string
          email: string
          enrollment_id: string | null
          grade: string
          id: string
          last_seen_at: string
          name: string
          phone: string
          token: string
        }
        Insert: {
          browser_fingerprint?: string | null
          created_at?: string
          email: string
          enrollment_id?: string | null
          grade: string
          id?: string
          last_seen_at?: string
          name: string
          phone: string
          token: string
        }
        Update: {
          browser_fingerprint?: string | null
          created_at?: string
          email?: string
          enrollment_id?: string | null
          grade?: string
          id?: string
          last_seen_at?: string
          name?: string
          phone?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_tokens_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_achievements: {
        Row: {
          achievement_type: string
          earned_at: string | null
          id: string
          learner_token_id: string | null
          points_earned: number | null
          user_id: string | null
        }
        Insert: {
          achievement_type: string
          earned_at?: string | null
          id?: string
          learner_token_id?: string | null
          points_earned?: number | null
          user_id?: string | null
        }
        Update: {
          achievement_type?: string
          earned_at?: string | null
          id?: string
          learner_token_id?: string | null
          points_earned?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_achievements_learner_token_id_fkey"
            columns: ["learner_token_id"]
            isOneToOne: false
            referencedRelation: "learner_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_courses: {
        Row: {
          category: string | null
          certificate_enabled: boolean
          content_type: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          duration: string | null
          enrolled_count: number | null
          id: string
          instructor: string | null
          instructor_avatar: string | null
          instructor_bio: string | null
          is_featured: boolean | null
          is_published: boolean | null
          language: string | null
          last_updated: string | null
          learning_outcomes: string[] | null
          level: string | null
          long_description: string | null
          prerequisites: string[] | null
          promo_video_url: string | null
          rating_avg: number | null
          rating_count: number | null
          skills: string[] | null
          slug: string
          tags: string[] | null
          target_audience: string | null
          thumbnail_url: string | null
          tinkercad_classroom_url: string | null
          tinkercad_project_url: string | null
          title: string
          updated_at: string | null
          view_count: number | null
          welcome_message: string | null
        }
        Insert: {
          category?: string | null
          certificate_enabled?: boolean
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          enrolled_count?: number | null
          id?: string
          instructor?: string | null
          instructor_avatar?: string | null
          instructor_bio?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          language?: string | null
          last_updated?: string | null
          learning_outcomes?: string[] | null
          level?: string | null
          long_description?: string | null
          prerequisites?: string[] | null
          promo_video_url?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          skills?: string[] | null
          slug: string
          tags?: string[] | null
          target_audience?: string | null
          thumbnail_url?: string | null
          tinkercad_classroom_url?: string | null
          tinkercad_project_url?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
          welcome_message?: string | null
        }
        Update: {
          category?: string | null
          certificate_enabled?: boolean
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          enrolled_count?: number | null
          id?: string
          instructor?: string | null
          instructor_avatar?: string | null
          instructor_bio?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          language?: string | null
          last_updated?: string | null
          learning_outcomes?: string[] | null
          level?: string | null
          long_description?: string | null
          prerequisites?: string[] | null
          promo_video_url?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          skills?: string[] | null
          slug?: string
          tags?: string[] | null
          target_audience?: string | null
          thumbnail_url?: string | null
          tinkercad_classroom_url?: string | null
          tinkercad_project_url?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      learning_discussions: {
        Row: {
          content: string
          course_id: string
          created_at: string | null
          id: string
          is_instructor_answer: boolean | null
          is_pinned: boolean | null
          module_id: string | null
          parent_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string | null
          id?: string
          is_instructor_answer?: boolean | null
          is_pinned?: boolean | null
          module_id?: string | null
          parent_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string | null
          id?: string
          is_instructor_answer?: boolean | null
          is_pinned?: boolean | null
          module_id?: string | null
          parent_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_discussions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_discussions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "learning_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_discussions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_modules: {
        Row: {
          content_type: string | null
          content_url: string | null
          course_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          section_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_type?: string | null
          content_url?: string | null
          course_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          section_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_type?: string | null
          content_url?: string | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          section_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_modules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "learning_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          is_completed: boolean | null
          last_position: number | null
          module_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          is_completed?: boolean | null
          last_position?: number | null
          module_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          is_completed?: boolean | null
          last_position?: number | null
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_resources: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_published: boolean | null
          resource_type: string | null
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          resource_type?: string | null
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          resource_type?: string | null
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      learning_reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          course_id: string
          created_at: string | null
          id: string
          is_approved: boolean | null
          learner_token_id: string | null
          rating: number
          review_text: string | null
          reviewer_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          learner_token_id?: string | null
          rating: number
          review_text?: string | null
          reviewer_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          learner_token_id?: string | null
          rating?: number
          review_text?: string | null
          reviewer_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_reviews_learner_token_id_fkey"
            columns: ["learner_token_id"]
            isOneToOne: false
            referencedRelation: "learner_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_sections: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_user_interactions: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          interaction_type: string
          learner_token_id: string | null
          user_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          interaction_type: string
          learner_token_id?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          interaction_type?: string
          learner_token_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_user_interactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_user_interactions_learner_token_id_fkey"
            columns: ["learner_token_id"]
            isOneToOne: false
            referencedRelation: "learner_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_user_stats: {
        Row: {
          created_at: string | null
          current_streak_days: number | null
          last_activity_date: string | null
          learner_token_id: string | null
          total_xp: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak_days?: number | null
          last_activity_date?: string | null
          learner_token_id?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak_days?: number | null
          last_activity_date?: string | null
          learner_token_id?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_user_stats_learner_token_id_fkey"
            columns: ["learner_token_id"]
            isOneToOne: false
            referencedRelation: "learner_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_workshops: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          instructor: string | null
          is_featured: boolean | null
          is_published: boolean | null
          location: string | null
          materials: string | null
          max_capacity: number | null
          registration_url: string | null
          slug: string
          title: string
          updated_at: string | null
          workshop_date: string | null
          workshop_time: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructor?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          location?: string | null
          materials?: string | null
          max_capacity?: number | null
          registration_url?: string | null
          slug: string
          title: string
          updated_at?: string | null
          workshop_date?: string | null
          workshop_time?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructor?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          location?: string | null
          materials?: string | null
          max_capacity?: number | null
          registration_url?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
          workshop_date?: string | null
          workshop_time?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          blocked_until: string | null
          created_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          blocked_until?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          blocked_until?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      module_content_blocks: {
        Row: {
          block_type: string
          code_language: string | null
          content: string | null
          created_at: string
          display_order: number
          id: string
          is_published: boolean
          module_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          block_type?: string
          code_language?: string | null
          content?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          module_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: string
          code_language?: string | null
          content?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          module_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_content_blocks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule: {
        Row: {
          created_at: string
          day_of_week: string | null
          description: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          location: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          bio: string | null
          created_at: string
          display_order: number | null
          email: string | null
          id: string
          image_url: string | null
          name: string
          role: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_order?: number | null
          email?: string | null
          id?: string
          image_url?: string | null
          name: string
          role: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_order?: number | null
          email?: string | null
          id?: string
          image_url?: string | null
          name?: string
          role?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          email: string | null
          id: string
          image_url: string | null
          linkedin_url: string | null
          name: string
          role: string
          show_email: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          image_url?: string | null
          linkedin_url?: string | null
          name: string
          role: string
          show_email?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          image_url?: string | null
          linkedin_url?: string | null
          name?: string
          role?: string
          show_email?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string
          session_started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          session_started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          session_started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users_management: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_management_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      team_members_public: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          email: string | null
          id: string | null
          image_url: string | null
          linkedin_url: string | null
          name: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          email?: never
          id?: string | null
          image_url?: string | null
          linkedin_url?: string | null
          name?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          email?: never
          id?: string | null
          image_url?: string | null
          linkedin_url?: string | null
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_advanced_rate_limit: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: Json
      }
      check_enrollment_rate_limit: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: boolean
      }
      check_login_rate_limit: { Args: { p_email: string }; Returns: boolean }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      has_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      increment_course_view_count: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_admin_role: { Args: { _user_id: string }; Returns: boolean }
      is_content_admin: { Args: { _user_id: string }; Returns: boolean }
      is_content_creator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "content_creator" | "coordinator" | "editor"
      blog_post_status: "draft" | "in_review" | "published"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "content_creator", "coordinator", "editor"],
      blog_post_status: ["draft", "in_review", "published"],
    },
  },
} as const
