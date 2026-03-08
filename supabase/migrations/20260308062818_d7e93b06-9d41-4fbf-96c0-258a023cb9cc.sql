-- Create all necessary triggers for data integrity

-- 1. Update enrollment progress when learning_progress changes
CREATE OR REPLACE TRIGGER trigger_update_enrollment_progress
AFTER INSERT OR UPDATE OR DELETE ON public.learning_progress
FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_progress();

-- 2. Update learner enrollment progress when learner_progress changes
CREATE OR REPLACE TRIGGER trigger_update_learner_progress
AFTER INSERT OR UPDATE OR DELETE ON public.learner_progress
FOR EACH ROW EXECUTE FUNCTION public.update_learner_enrollment_progress();

-- 3. Update course rating when reviews change
CREATE OR REPLACE TRIGGER trigger_update_course_rating
AFTER INSERT OR UPDATE OR DELETE ON public.learning_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_course_rating();

-- 4. Update enrolled count when enrollments change
CREATE OR REPLACE TRIGGER trigger_update_enrolled_count
AFTER INSERT OR UPDATE OR DELETE ON public.learning_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_enrolled_count();

-- 5. Calculate blog reading time on insert/update
CREATE OR REPLACE TRIGGER calculate_blog_reading_time
BEFORE INSERT OR UPDATE OF content ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.calculate_reading_time();

-- 6. Updated_at triggers for learning tables
CREATE OR REPLACE TRIGGER set_learning_courses_updated_at
BEFORE UPDATE ON public.learning_courses
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

CREATE OR REPLACE TRIGGER set_learning_sections_updated_at
BEFORE UPDATE ON public.learning_sections
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

CREATE OR REPLACE TRIGGER set_learning_modules_updated_at
BEFORE UPDATE ON public.learning_modules
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

CREATE OR REPLACE TRIGGER set_learning_resources_updated_at
BEFORE UPDATE ON public.learning_resources
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

CREATE OR REPLACE TRIGGER set_learning_workshops_updated_at
BEFORE UPDATE ON public.learning_workshops
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

-- 7. Module content blocks updated_at
CREATE OR REPLACE TRIGGER update_module_content_blocks_updated_at
BEFORE UPDATE ON public.module_content_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

-- 8. Validate enrollment submissions
CREATE OR REPLACE TRIGGER validate_enrollment_before_insert
BEFORE INSERT ON public.enrollment_submissions
FOR EACH ROW EXECUTE FUNCTION public.validate_enrollment_submission();