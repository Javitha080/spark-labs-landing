/**
 * Bot Pre-rendering: Serves real HTML to search engine crawlers
 * instead of the empty <div id="root"></div> from the React SPA.
 */

const BOTS = [
  "googlebot","google-inspectiontool","storebot-google","bingbot",
  "slurp","duckduckbot","baiduspider","yandexbot","sogou","applebot",
  "petalbot","bytespider","facebookexternalhit","twitterbot",
  "linkedinbot","whatsapp","telegrambot","discordbot","pinterestbot",
  "redditbot","ia_archiver","semrushbot","ahrefsbot","mj12bot",
  "dotbot","chrome-lighthouse",
];

export function isBot(ua: string): boolean {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BOTS.some((b) => lower.includes(b));
}

const NAV = '<header role="banner"><nav aria-label="Main navigation"><a href="/"><strong>YICDVP</strong> — Young Innovators Club</a> <a href="/about">About</a> <a href="/projects">Projects</a> <a href="/events">Events</a> <a href="/blog">Blog</a> <a href="/gallery">Gallery</a> <a href="/team">Team</a> <a href="/learning-hub">Learning Hub</a> <a href="/contact">Contact</a></nav></header>';

const FOOT = '<footer role="contentinfo"><nav aria-label="Footer"><a href="/about">About</a> <a href="/projects">Projects</a> <a href="/events">Events</a> <a href="/blog">Blog</a> <a href="/gallery">Gallery</a> <a href="/team">Team</a> <a href="/learning-hub">Learning Hub</a> <a href="/contact">Contact</a> <a href="/privacy-policy">Privacy</a> <a href="/terms-of-service">Terms</a></nav><p>© 2026 Young Innovators Club of Dharmapala Vidyalaya Pannipitiya. All rights reserved.</p></footer>';

const wrap = (main: string) => `${NAV}<main>${main}</main>${FOOT}`;

const PAGES: Record<string, string> = {};

PAGES["/"] = wrap(
  '<section><h1>Young Innovators Club — School Invention Club at Dharmapala Vidyalaya Pannipitiya</h1>' +
  '<h2>Innovate. Create. Disrupt.</h2>' +
  '<p>Empowering the next generation of tech leaders at Dharmapala Vidyalaya Pannipitiya, Sri Lanka. The Young Innovators Club (YICDVP) is Sri Lanka\'s premier school invention club, fostering STEM education, robotics, IoT, and sustainable innovation through hands-on projects.</p>' +
  '<p>100+ Members · 50+ Projects · 15+ Awards</p>' +
  '<a href="/#join">Join the Club</a> <a href="/projects">Our Projects</a></section>' +
  '<section><h2>About YICDVP</h2><p>Founded in 2020, the Young Innovators Club is a student-led innovation society dedicated to STEM education. We provide hands-on experience in robotics, IoT, solar energy, programming, 3D printing, and engineering.</p>' +
  '<ul><li>Robotics workshops and competitions</li><li>Internet of Things (IoT) projects</li><li>Solar energy and sustainable innovation</li><li>Programming and coding sessions</li><li>3D printing workshops</li><li>Inter-school STEM competitions</li></ul></section>' +
  '<section><h2>Our Innovation Projects</h2><p>Explore innovative STEM projects in robotics, IoT, solar energy, and engineering — built by students.</p><a href="/projects">View All Projects</a></section>' +
  '<section><h2>Events &amp; Workshops</h2><p>Join our workshops, hackathons, and inter-school competitions.</p><a href="/events">View Events</a></section>' +
  '<section><h2>Our Team</h2><p>Meet the students and teachers who drive innovation at YICDVP.</p><a href="/team">Meet the Team</a></section>' +
  '<section><h2>Join the Club</h2><p>Are you a student at Dharmapala Vidyalaya? Join Sri Lanka\'s leading school invention club today!</p><a href="/contact">Apply Now</a></section>' +
  '<section><h2>Innovation Blog</h2><p>Read articles, project updates, and STEM insights.</p><a href="/blog">Read Our Blog</a></section>' +
  '<section><h2>STEM Learning Hub</h2><p>Free courses and tutorials on robotics, programming, IoT, and engineering.</p><a href="/learning-hub">Start Learning</a></section>'
);

PAGES["/about"] = wrap(
  '<h1>About the Young Innovators Club — YICDVP</h1>' +
  '<p>The Young Innovators Club of Dharmapala Vidyalaya Pannipitiya (YICDVP) is Sri Lanka\'s premier school invention club — a student-led innovation society dedicated to empowering young minds through hands-on STEM education, robotics, IoT, and sustainable innovation.</p>' +
  '<h2>Our Mission</h2><p>To inspire, educate, and empower students to become innovators, engineers, and problem-solvers through practical STEM education.</p>' +
  '<h2>Why Join?</h2><ul><li>Hands-on robotics, IoT, Arduino, 3D printing</li><li>National and international STEM competitions</li><li>Learn from industry professionals</li><li>Build a real-world project portfolio</li><li>Develop leadership and teamwork skills</li></ul>'
);

PAGES["/projects"] = wrap(
  '<h1>Innovation Projects — Young Innovators Club</h1>' +
  '<p>Explore innovative STEM projects created by students of the Young Innovators Club at Dharmapala Vidyalaya Pannipitiya — spanning robotics, IoT, solar energy, sustainable engineering, and more.</p>' +
  '<h2>Categories</h2><ul><li>Robotics — Autonomous robots, robotic arms, line followers</li><li>IoT — Smart sensors, environmental monitoring</li><li>Solar Energy — Solar-powered devices</li><li>Engineering — 3D printed prototypes</li><li>Programming — Web apps, AI experiments</li></ul>'
);

PAGES["/blog"] = wrap(
  '<h1>Innovation Blog — Young Innovators Club</h1>' +
  '<p>Read articles, project updates, tutorials, and STEM insights from Sri Lanka\'s leading school invention club at Dharmapala Vidyalaya Pannipitiya.</p>' +
  '<h2>Topics</h2><ul><li>Robotics tutorials and guides</li><li>IoT and Arduino projects</li><li>Competition recaps</li><li>Innovation stories</li><li>Workshop announcements</li></ul>'
);

PAGES["/events"] = wrap(
  '<h1>Events &amp; Workshops — Young Innovators Club</h1>' +
  '<p>Join workshops, hackathons, and STEM competitions hosted by the Young Innovators Club at Dharmapala Vidyalaya Pannipitiya.</p>' +
  '<ul><li>Robotics workshops</li><li>Coding bootcamps</li><li>Inter-school STEM competitions</li><li>Science fairs</li><li>Guest lectures</li></ul>'
);

PAGES["/team"] = wrap(
  '<h1>Our Team — Young Innovators Club</h1>' +
  '<p>Meet the passionate students and dedicated teachers who drive innovation at the Young Innovators Club, Dharmapala Vidyalaya Pannipitiya.</p>' +
  '<h2>Student Leaders</h2><p>Our student leaders guide club activities, organize events, and mentor younger members.</p>' +
  '<h2>Teacher Mentors</h2><p>Dedicated teachers providing guidance and expertise to help students achieve their innovation goals.</p>'
);

PAGES["/gallery"] = wrap(
  '<h1>Gallery — Young Innovators Club</h1>' +
  '<p>Browse photos and videos from workshops, events, competitions, and project showcases at Dharmapala Vidyalaya Pannipitiya.</p>'
);

PAGES["/contact"] = wrap(
  '<h1>Contact Us — Young Innovators Club</h1>' +
  '<p>Get in touch with the Young Innovators Club at Dharmapala Vidyalaya Pannipitiya. Whether you want to join, collaborate, or learn more about our STEM programs, we\'d love to hear from you.</p>' +
  '<h2>Location</h2><p>Dharmapala Vidyalaya, Pannipitiya Road, Pannipitiya 10230, Sri Lanka</p>' +
  '<h2>For Teachers &amp; Mentors</h2><p>We\'re always looking for STEM mentors. Reach out to volunteer or collaborate.</p>'
);

PAGES["/learning-hub"] = wrap(
  '<h1>STEM Learning Hub — Young Innovators Club</h1>' +
  '<p>Free educational resources, courses, and tutorials on robotics, programming, IoT, and engineering for students at all levels.</p>' +
  '<h2>Available Courses</h2><ul><li>Introduction to Robotics</li><li>Arduino Programming</li><li>IoT Sensor Projects</li><li>Web Development</li><li>3D Printing and CAD</li><li>Solar Energy</li><li>Python Programming</li></ul>'
);

PAGES["/privacy-policy"] = wrap(
  '<h1>Privacy Policy — Young Innovators Club</h1>' +
  '<p>This Privacy Policy describes how YICDVP collects, uses, and protects your personal information.</p>'
);

PAGES["/terms-of-service"] = wrap(
  '<h1>Terms of Service — Young Innovators Club</h1>' +
  '<p>These Terms of Service govern your use of the Young Innovators Club website and services.</p>'
);

/**
 * Inject pre-rendered HTML into the response body for bot requests.
 * Replaces <div id="root"></div> with <div id="root">{content}</div>
 */
export async function injectPrerenderContent(
  response: Response,
  pathname: string
): Promise<Response> {
  // Normalize path — strip trailing slash
  const path = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  const content = PAGES[path];

  if (!content) {
    // No pre-render content for this path; return original
    return response;
  }

  const html = await response.text();

  // Replace the empty root with pre-rendered content
  const injected = html.replace(
    '<div id="root"></div>',
    `<div id="root">${content}</div>`
  );

  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
