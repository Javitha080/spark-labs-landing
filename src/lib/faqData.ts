/**
 * Homepage FAQ content - single source of truth.
 *
 * Imported by BOTH the FAQ React section (src/components/home/FAQ.tsx) and
 * the Worker bot-prerender (src/worker/prerender.ts), so the FAQPage
 * structured data served to crawlers always matches what users see.
 * Intentionally dependency-free (no React imports) to keep the Worker
 * bundle lean.
 */
export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "How can my child join the Young Innovators Club?",
    answer:
      "Students of Dharmapala Vidyalaya can join by filling out the membership form on our website or visiting the club room. We accept new members at the start of each term, but students can express interest anytime throughout the year.",
  },
  {
    question: "What age groups does the club cater to?",
    answer:
      "We welcome students from Grade 6 to Grade 13. Our programs are structured into junior (Grades 6-9) and senior (Grades 10-13) tracks, with age-appropriate projects and challenges for each group.",
  },
  {
    question: "Are there any membership fees?",
    answer:
      "Membership is currently free for Dharmapala Vidyalaya students, with project materials typically provided by the school and sponsors. Please confirm current arrangements with the club coordinators via our contact form.",
  },
  {
    question: "What kind of projects do members work on?",
    answer:
      "Members work on a wide range of STEM projects including robotics, IoT (Internet of Things), solar energy systems, web and app development, 3D printing, and Arduino-based electronics. Projects are hands-on and designed to solve real-world problems.",
  },
  {
    question: "Do students need prior coding or tech experience?",
    answer:
      "Absolutely not! We start from the basics and provide structured learning paths. Many of our most accomplished members joined with zero technical background. Our mentors and senior students guide newcomers every step of the way.",
  },
  {
    question: "When does the club meet?",
    answer:
      "Sessions are typically held on Saturdays at the school STEM lab, with extra sessions sometimes added around competitions or project deadlines. Check our events page or contact us for the current schedule.",
  },
  {
    question: "Does the club participate in competitions?",
    answer:
      "Yes! We take part in national STEM competitions, hackathons, science fairs, and robotics challenges when places are available. Ask a mentor about upcoming events and selection.",
  },
  {
    question: "How can parents or organizations support the club?",
    answer:
      "We welcome support in many forms - sponsoring components and equipment, providing mentorship, offering workshop spaces, or financial contributions. Please reach out via our contact form and our team will get in touch.",
  },
];
