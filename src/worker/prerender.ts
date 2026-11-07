/**
 * Bot Pre-rendering: Serves real HTML to search engine crawlers
 * instead of the empty <div id="root"></div> from the React SPA.
 *
 * NOTE: For `/` to actually receive prerender content, `assets.run_worker_first`
 * in wrangler.json MUST include `/` (otherwise Cloudflare serves /index.html
 * directly without invoking this Worker).
 */

import { faqItems } from "../lib/faqData";
import { stripHtmlTags } from "../lib/sanitize";

const BOTS = [
  "googlebot","google-inspectiontool","storebot-google","bingbot","bingpreview",
  "slurp","duckduckbot","baiduspider","yandexbot","yandex.com","sogou","applebot",
  "applebot-extended","petalbot","bytespider","facebookexternalhit","meta-externalagent",
  "twitterbot","linkedinbot","whatsapp","telegrambot","discordbot","pinterestbot",
  "redditbot","ia_archiver","semrushbot","ahrefsbot","mj12bot",
  "dotbot","chrome-lighthouse",
  // AI search assistants (ChatGPT search, Perplexity, Claude, Gemini/AI training opt-ins)
  "gptbot","oai-searchbot","chatgpt-user","claudebot","claude-web","perplexitybot",
  "google-extended",
  // Regional engines
  "seznambot","naverbot","yeti","yisouspider","mojeekbot",
];

export function isBot(ua: string): boolean {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BOTS.some((b) => lower.includes(b));
}

const NAV = '<header role="banner"><nav aria-label="Main navigation"><a href="/"><strong>YICDVP</strong> - Young Innovators Club</a> <a href="/about">About</a> <a href="/projects">Projects</a> <a href="/events">Events</a> <a href="/news">News</a> <a href="/blog">Blog</a> <a href="/gallery">Gallery</a> <a href="/team">Team</a> <a href="/learning-hub">Learning Hub</a> <a href="/contact">Contact</a></nav></header>';

const FOOT = '<footer role="contentinfo"><nav aria-label="Footer"><a href="/about">About</a> <a href="/projects">Projects</a> <a href="/events">Events</a> <a href="/news">News</a> <a href="/blog">Blog</a> <a href="/gallery">Gallery</a> <a href="/team">Team</a> <a href="/learning-hub">Learning Hub</a> <a href="/contact">Contact</a> <a href="/privacy-policy">Privacy</a> <a href="/terms-of-service">Terms</a></nav><address>Dharmapala Vidyalaya, Pannipitiya Road, Pannipitiya 10230, Western Province, Sri Lanka</address><p>© 2026 Young Innovators Club of Dharmapala Vidyalaya Pannipitiya. All rights reserved.</p></footer>';

const wrap = (main: string) => `${NAV}<main>${main}</main>${FOOT}`;

const PAGES: Record<string, string> = {};

PAGES["/"] = wrap(
  '<section><h1>Young Innovators Club - School Invention Club at Dharmapala Vidyalaya Pannipitiya</h1>' +
  '<h2>Innovate. Create. Disrupt.</h2>' +
  '<p>The Young Innovators Club (YICDVP) is Sri Lanka\'s premier school invention club and the flagship STEM society among the clubs of Dharmapala Vidyalaya, Pannipitiya. Since 2020 we have empowered students to design, build, and ship real-world solutions across robotics, the Internet of Things (IoT), solar and sustainable energy, 3D printing, and software engineering.</p>' +
  '<p><strong>Also known as:</strong> Young Innovations Club, Inventions Club, Innovation Club of Dharmapala Vidyalaya Pannipitiya.</p>' +
  '<p>Our members have shipped 50+ student-built projects, won 15+ national and inter-school awards, and grown into a 100+ strong community of student inventors, engineers, programmers, and creative problem-solvers.</p>' +
  '<p><strong>100+ Members · 50+ Projects · 15+ Awards · 5+ Years</strong></p>' +
  '<p><a href="/#join">Join the Club</a> · <a href="/projects">Our Projects</a> · <a href="/learning-hub">Start Learning</a> · <a href="/contact">Contact Us</a></p></section>' +

  '<section><h2>About YICDVP - Sri Lanka\'s Leading School Invention Club</h2>' +
  '<p>Founded in 2020 inside Dharmapala Vidyalaya Pannipitiya, the Young Innovators Club is a student-led innovation society dedicated to hands-on STEM education. Unlike a traditional classroom, every member works on real prototypes: soldering circuits, writing firmware, training models, 3D-printing parts, and pitching inventions at competitions across Sri Lanka.</p>' +
  '<p>We are run by students, mentored by teachers, and supported by an alumni network of engineers and university researchers. Membership is free and open to every Dharmapala Vidyalaya student who wants to build, break, and rebuild things.</p>' +
  '<ul><li>Weekly hands-on robotics workshops and competitions</li>' +
  '<li>Internet of Things (IoT) and sensor network projects with Arduino, ESP32, Raspberry Pi</li>' +
  '<li>Solar energy and sustainable innovation prototypes</li>' +
  '<li>Programming and coding sessions: Python, JavaScript, C++, embedded systems</li>' +
  '<li>3D printing, CAD design, and rapid prototyping workshops</li>' +
  '<li>Inter-school STEM competitions and national science fairs</li>' +
  '<li>Mentorship from industry professionals and university researchers</li></ul></section>' +

  '<section><h2>Our Innovation Projects</h2>' +
  '<p>Explore award-winning STEM projects built by Young Innovators Club members - from line-following robots and automated greenhouses to solar-powered water purifiers and AI-driven attendance systems. Every project is designed, built, and documented by students.</p>' +
  '<p><a href="/projects">View All Projects</a></p></section>' +

  '<section><h2>Events &amp; Workshops</h2>' +
  '<p>Join hands-on workshops, weekend hackathons, robotics tournaments, and inter-school STEM competitions hosted year-round. Our annual flagship innovation showcase brings together students, alumni, parents, and industry guests.</p>' +
  '<ul>' +
  '<li><strong>Annual Innovation Showcase 2026</strong> - YICDVP\'s flagship project demo day with student pitches, alumni judging, and industry guests. <em>Date: April 2026 · Dharmapala Vidyalaya Main Hall.</em></li>' +
  '<li><strong>Inter-School Robotics Tournament 2026</strong> - Teams from across the Western Province compete in line-follow, maze-solve, and innovation categories. <em>Date: May 2026 · Open to all partner schools.</em></li>' +
  '<li><strong>Arduino Bootcamp (April Holidays)</strong> - A 5-day intensive for Dharmapala Vidyalaya students, no experience required, kits provided. <em>Date: April 13-17 2026 · YICDVP Maker Space.</em></li>' +
  '<li><strong>National Science Fair Entries 2026</strong> - YICDVP members submit original research projects in physics, biology, and environmental science. <em>Date: July 2026 · Provincial + National rounds.</em></li>' +
  '<li><strong>Weekly Robotics Workshops</strong> - Every Saturday at the YICDVP Maker Space, open to all DVP students. <em>Recurring · Free to attend.</em></li>' +
  '</ul>' +
  '<p><a href="/events">View Upcoming Events</a></p></section>' +

  '<section><h2>Our Team &amp; Leadership</h2>' +
  '<p>Meet the student leaders, project captains, and teacher mentors who keep YICDVP running. Our leadership rotates yearly, giving every member a chance to lead a workshop, manage a project, or organise an event.</p>' +
  '<p><a href="/team">Meet the Team</a> · <a href="/leadership">Our Leadership</a></p></section>' +

  '<section id="join"><h2>Join the Club</h2>' +
  '<p>Are you a student at Dharmapala Vidyalaya Pannipitiya? Joining YICDVP is free and takes 2 minutes. You\'ll get access to our maker space, free tools and components, mentorship from senior members, and a shot at competing nationally.</p>' +
  '<p><a href="/contact">Apply Now</a></p></section>' +

  '<section><h2>Innovation Blog</h2>' +
  '<p>Read student-written articles, project deep-dives, tutorials, and competition recaps. Topics include robotics, Arduino projects, IoT sensor networks, web development, AI experiments, and innovation stories from across Sri Lanka.</p>' +
  '<p><a href="/blog">Read Our Blog</a></p></section>' +

  '<section><h2>STEM Learning Hub</h2>' +
  '<p>Free, self-paced courses and tutorials on robotics, programming, IoT, 3D printing, and engineering - designed for Sri Lankan school students. Perfect for absolute beginners as well as experienced makers preparing for university.</p>' +
  '<p><a href="/learning-hub">Start Learning</a></p></section>'
);

PAGES["/about"] = wrap(
  '<h1>About the Young Innovators Club - YICDVP</h1>' +
  '<p>The Young Innovators Club of Dharmapala Vidyalaya Pannipitiya (YICDVP) is Sri Lanka\'s premier school invention club. We are a student-led innovation society inside Dharmapala Vidyalaya, founded in 2020, dedicated to empowering young minds through hands-on STEM education, robotics, IoT, sustainable energy, and software engineering.</p>' +

  '<h2>Our Mission</h2>' +
  '<p>To inspire, educate, and empower Sri Lankan students to become inventors, engineers, scientists, and problem-solvers through practical, project-based STEM education. We believe every student should ship at least one real working invention before they finish school.</p>' +

  '<h2>Our Vision</h2>' +
  '<p>A generation of confident young Sri Lankan innovators who design and build the technology that solves local problems - from agriculture and clean water to renewable energy and accessibility.</p>' +

  '<h2>What We Do</h2>' +
  '<p>YICDVP runs weekly workshops, monthly project sprints, annual competitions, and ongoing mentorship programs. Members typically join one of our project tracks (robotics, IoT, solar, software, or 3D printing) and spend the year building a real invention with a team of 3-5 students under a senior mentor.</p>' +

  '<h2>Why Join?</h2>' +
  '<ul>' +
  '<li><strong>Hands-on building</strong> - robotics, IoT, Arduino, ESP32, Raspberry Pi, 3D printing, soldering, CAD</li>' +
  '<li><strong>Compete nationally</strong> - represent your school at national and international STEM competitions</li>' +
  '<li><strong>Real mentorship</strong> - learn from teachers, alumni at top universities, and industry professionals</li>' +
  '<li><strong>Portfolio building</strong> - graduate with a real-world project portfolio, useful for university applications</li>' +
  '<li><strong>Leadership skills</strong> - lead a project, organise an event, run a workshop</li>' +
  '<li><strong>Free tools and components</strong> - access our maker space, electronic kits, and 3D printers</li>' +
  '</ul>' +

  '<h2>Our History</h2>' +
  '<p>YICDVP was founded in 2020 by a small group of Dharmapala Vidyalaya students passionate about robotics and electronics. From an after-school coding circle of 7 students, we have grown into a 100+ member innovation society with a permanent maker space, dedicated teacher mentors, and a proven track record in national STEM competitions.</p>' +

  '<p><a href="/team">Meet our team</a> · <a href="/projects">See our projects</a> · <a href="/contact">Get in touch</a></p>'
);

PAGES["/projects"] = wrap(
  '<h1>Innovation Projects - Young Innovators Club</h1>' +
  '<p>Explore the portfolio of student-built innovation projects from the Young Innovators Club at Dharmapala Vidyalaya Pannipitiya. Every project is designed, prototyped, programmed, and documented by our members - spanning robotics, IoT, solar energy, sustainable engineering, web development, and AI experiments.</p>' +

  '<h2>Project Categories</h2>' +

  '<h3>Robotics Projects</h3>' +
  '<p>Autonomous robots, robotic arms, line-following bots, maze solvers, and obstacle-avoidance vehicles built using Arduino, ESP32, and custom 3D-printed chassis. Members compete in local and inter-school robotics tournaments.</p>' +

  '<h3>Internet of Things (IoT) Projects</h3>' +
  '<p>Smart sensor networks for environmental monitoring (air quality, temperature, soil moisture), connected classroom systems, RFID attendance trackers, and smart-home prototypes - built with ESP32, Raspberry Pi, MQTT, and cloud dashboards.</p>' +

  '<h3>Solar &amp; Renewable Energy Projects</h3>' +
  '<p>Solar-powered water pumps, sun-tracking panels, off-grid LED lighting kits, and small wind turbines designed for rural Sri Lankan use cases. Focused on accessibility, durability, and low cost.</p>' +

  '<h3>Engineering &amp; 3D Printing Projects</h3>' +
  '<p>3D-printed prosthetics, custom enclosures, mechanical prototypes, and CAD-designed parts. Members learn Fusion 360, FreeCAD, and FDM printing fundamentals.</p>' +

  '<h3>Programming &amp; Software Projects</h3>' +
  '<p>Web applications, mobile apps, AI experiments, computer-vision prototypes, and embedded firmware projects in Python, JavaScript, C++, and Rust.</p>' +

  '<h3>Science Fair &amp; Research Projects</h3>' +
  '<p>Original research and experimental projects entered into national science fairs - covering physics, biology, chemistry, environmental science, and applied mathematics.</p>' +

  '<p><a href="/blog">Read project case studies on our blog</a> · <a href="/learning-hub">Learn the skills to build your own</a> · <a href="/contact">Propose a new project</a></p>'
);

PAGES["/blog"] = wrap(
  '<h1>Innovation Blog - Young Innovators Club</h1>' +
  '<p>Read student-written articles, project deep-dives, tutorials, competition recaps, and STEM insights from Sri Lanka\'s leading school invention club at Dharmapala Vidyalaya Pannipitiya. Our blog is written by YICDVP members and mentors - practical, hands-on, and from the perspective of school students actively building things.</p>' +

  '<h2>What You\'ll Find Here</h2>' +
  '<ul>' +
  '<li><strong>Robotics tutorials</strong> - step-by-step guides for building line-followers, robotic arms, and obstacle-avoidance robots with Arduino and ESP32</li>' +
  '<li><strong>IoT and Arduino projects</strong> - sensor networks, smart-home prototypes, weather stations, and MQTT dashboards</li>' +
  '<li><strong>Competition recaps</strong> - what worked, what didn\'t, and lessons from national and inter-school STEM events</li>' +
  '<li><strong>Innovation stories</strong> - how members discovered, designed, and shipped their first real invention</li>' +
  '<li><strong>Workshop announcements</strong> - upcoming hands-on sessions open to Dharmapala Vidyalaya students</li>' +
  '<li><strong>Career &amp; university advice</strong> - what to study, where to apply, and how to use your YICDVP portfolio</li>' +
  '<li><strong>Component reviews</strong> - practical reviews of microcontrollers, sensors, and tools sold in Sri Lanka</li>' +
  '</ul>' +

  '<h2>For Students, Teachers, and Parents</h2>' +
  '<p>Our blog is written in clear, accessible English aimed at Sri Lankan school students aged 12-18, but is equally useful for teachers running STEM clubs and parents who want to support their child\'s interest in engineering, programming, or science.</p>' +

  '<p><a href="/projects">See finished projects</a> · <a href="/learning-hub">Take a free course</a> · <a href="/contact">Submit a guest post</a></p>'
);

PAGES["/news"] = wrap(
  '<h1>Newsroom - Young Innovators Club</h1>' +
  '<p>Announcements, competition results, and event coverage published by the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya. Everything here is written by club members and mentors and posted as it happens, so students, parents, and partner schools can follow the club without waiting for a newsletter.</p>' +

  '<h2>What We Publish</h2>' +
  '<ul>' +
  '<li><strong>Club announcements</strong> - recruitment windows, meeting changes, new equipment, and learning-hub releases</li>' +
  '<li><strong>Competition results</strong> - national and inter-school robotics, science, and innovation event outcomes</li>' +
  '<li><strong>Event coverage</strong> - recaps from workshops, hackathons, and school exhibitions</li>' +
  '<li><strong>Member milestones</strong> - projects selected for showcases, awards, and external recognition</li>' +
  '</ul>' +

  '<h2>How This Page Differs From the Blog</h2>' +
  '<p>The <a href="/blog">Innovation Blog</a> holds long-form tutorials, build guides, and deep-dives. The newsroom is the short-form feed: time-sensitive updates and results, newest first.</p>' +

  '<p><a href="/events">See upcoming events</a> · <a href="/blog">Read the blog</a> · <a href="/contact">Send us a tip</a></p>'
);

PAGES["/events"] = wrap(
  '<h1>Events &amp; Workshops - Young Innovators Club</h1>' +
  '<p>The Young Innovators Club runs hands-on workshops, weekend hackathons, robotics tournaments, and inter-school STEM competitions throughout the school year. Most events are free and open to Dharmapala Vidyalaya students, and many also welcome students from partner schools across the Colombo and Western Province region.</p>' +

  '<h2>Regular Events</h2>' +

  '<h3>Weekly Robotics Workshops</h3>' +
  '<p>Every week, members gather in the maker space for guided hands-on workshops covering Arduino, ESP32, sensors, motors, and the fundamentals of mechatronics. Beginners and experienced builders both welcome.</p>' +

  '<h3>Coding Bootcamps</h3>' +
  '<p>Intensive holiday-period bootcamps in Python, web development, embedded C, and AI. Built specifically for school students - no university background required.</p>' +

  '<h3>Inter-School STEM Competitions</h3>' +
  '<p>YICDVP regularly competes in and hosts inter-school robotics, science, and innovation contests. We have brought home 15+ awards in the last 5 years.</p>' +

  '<h3>Annual Innovation Showcase</h3>' +
  '<p>Our flagship event each year - every project team demos their work to parents, alumni, industry guests, and university recruiters. The best projects are pitched to a panel of professional engineers and entrepreneurs.</p>' +

  '<h3>Science Fairs</h3>' +
  '<p>Members enter national and provincial science fairs with original research projects in physics, biology, chemistry, and environmental science.</p>' +

  '<h3>Guest Lectures</h3>' +
  '<p>Engineers, researchers, and university faculty speak to members about real-world STEM careers, current research, and the skills employers actually need.</p>' +

  '<p><a href="/contact">Volunteer or co-host an event</a> · <a href="/blog">Read past event recaps</a></p>'
);

PAGES["/team"] = wrap(
  '<h1>Our Team - Young Innovators Club</h1>' +
  '<p>Meet the passionate students, dedicated teachers, and alumni mentors who drive innovation at the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya. YICDVP is a student-led club: every leadership position is held by a current Dharmapala Vidyalaya student, with teacher mentors and alumni providing guidance.</p>' +

  '<h2>Student Leadership</h2>' +
  '<p>Our student leaders are elected annually from active members. They organise weekly workshops, manage project teams, coordinate competition entries, mentor newer members, and run the club\'s day-to-day operations. Roles include the Club President, Vice President, Project Captains for each technical track, Events Coordinator, and Communications Lead.</p>' +

  '<h2>Project Captains</h2>' +
  '<p>Each technical track - robotics, IoT, solar, software, 3D printing - is led by a senior student Project Captain. They design the year\'s project roadmap, lead workshops, and mentor 3-5 junior members building their first real invention.</p>' +

  '<h2>Teacher Mentors</h2>' +
  '<p>Dedicated teachers from Dharmapala Vidyalaya provide academic guidance, ensure safety in the maker space, help connect projects with the school curriculum, and chaperone members at off-site competitions and events.</p>' +

  '<h2>Alumni Network</h2>' +
  '<p>YICDVP alumni - now studying engineering, computer science, physics, and applied sciences at universities in Sri Lanka and abroad - return regularly to mentor current members, run guest workshops, and help with project reviews.</p>' +

  '<h2>Industry &amp; University Mentors</h2>' +
  '<p>We partner with practicing engineers, researchers, and university faculty who volunteer their time for guest lectures, project critiques, and one-on-one mentorship sessions.</p>' +

  '<p><a href="/leadership">Meet our leadership</a> · <a href="/contact">Volunteer as a mentor</a> · <a href="/about">About YICDVP</a></p>'
);

PAGES["/leadership"] = wrap(
  '<h1>Leadership - Young Innovators Club</h1>' +
  '<p>The Young Innovators Club is led by an elected committee of senior Dharmapala Vidyalaya students, supported by teacher advisors and alumni mentors. Our leadership rotates each academic year so every active member has the chance to lead a workshop, manage a project team, or organise a club-wide event.</p>' +

  '<h2>Executive Committee</h2>' +
  '<p>Composed of the Club President, Vice President, Secretary, Treasurer, and Communications Lead. The committee meets weekly to plan workshops, manage the club budget, review project progress, and prepare for competitions.</p>' +

  '<h2>Project Captains</h2>' +
  '<p>Each technical track - Robotics, IoT, Solar, Software, 3D Printing, Science Fair - is led by a Project Captain who plans the year\'s curriculum and mentors a team of junior members through their first real invention.</p>' +

  '<h2>Teacher Advisors</h2>' +
  '<p>Senior teachers from Dharmapala Vidyalaya provide academic guidance, mentorship, and safety oversight in the maker space, ensuring that every project meets the school\'s educational standards.</p>' +

  '<p><a href="/team">Meet the full team</a> · <a href="/about">About YICDVP</a></p>'
);

PAGES["/gallery"] = wrap(
  '<h1>Gallery - Young Innovators Club</h1>' +
  '<p>Browse photos and videos from workshops, projects, competitions, hackathons, and project showcases at the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya. Our gallery is updated regularly with new builds, event recaps, and behind-the-scenes shots of student inventors at work.</p>' +

  '<h2>Workshop &amp; Maker Space</h2>' +
  '<p>Inside YICDVP\'s maker space - soldering stations, 3D printers, robotics kits, microcontrollers, and the students who use them every week.</p>' +

  '<h2>Project Showcases</h2>' +
  '<p>Finished and in-progress student projects across robotics, IoT, solar energy, 3D printing, and software - including line-followers, robotic arms, weather stations, and solar-powered devices.</p>' +

  '<h2>Competitions &amp; Events</h2>' +
  '<p>YICDVP members at inter-school robotics tournaments, national science fairs, weekend hackathons, and our annual Innovation Showcase event.</p>' +

  '<h2>Workshops &amp; Guest Lectures</h2>' +
  '<p>Highlights from guest lectures, hands-on workshops, soldering bootcamps, coding sessions, and university partnership programmes.</p>' +

  '<p><a href="/projects">See project details</a> · <a href="/events">Upcoming events</a> · <a href="/contact">Photo credits &amp; usage</a></p>'
);

PAGES["/contact"] = wrap(
  '<h1>Contact Us - Young Innovators Club</h1>' +
  '<p>Get in touch with the Young Innovators Club at Dharmapala Vidyalaya Pannipitiya. Whether you want to join the club, propose a collaboration, mentor our students, host a workshop, or learn more about our STEM programs, we\'d love to hear from you.</p>' +

  '<h2>For Students Who Want to Join</h2>' +
  '<p>If you\'re a current Dharmapala Vidyalaya student, joining YICDVP is free and takes 2 minutes. Submit your details through our enrolment form and we\'ll invite you to the next workshop. No prior experience required - beginners are very welcome.</p>' +

  '<h2>For Teachers, Mentors &amp; Industry Professionals</h2>' +
  '<p>We actively partner with practicing engineers, researchers, and university faculty who want to give back. Mentorship can be a one-off guest lecture, a recurring monthly review session, or full project sponsorship. We are especially looking for mentors in embedded systems, AI/ML, renewable energy, and product design.</p>' +

  '<h2>For Schools Interested in Collaboration</h2>' +
  '<p>YICDVP collaborates with other schools across Sri Lanka on joint workshops, inter-school competitions, and shared project tracks. If you run a STEM club at another school, get in touch - we are happy to share curriculum, host visits, and co-organise events.</p>' +

  '<h2>For Sponsors &amp; Donors</h2>' +
  '<p>YICDVP is funded by school grants, alumni donations, and community sponsors. Contributions of components, tools, 3D printers, microcontrollers, or financial support directly enable more student projects. We provide transparent reporting on how every donation is used.</p>' +

  '<h2>Location</h2>' +
  '<address>Dharmapala Vidyalaya<br>Pannipitiya Road, Pannipitiya 10230<br>Western Province, Sri Lanka</address>' +

  '<p><a href="/about">About YICDVP</a> · <a href="/projects">See our projects</a> · <a href="/team">Meet the team</a></p>'
);

PAGES["/learning-hub"] = wrap(
  '<h1>STEM Learning Hub - Young Innovators Club</h1>' +
  '<p>The YICDVP Learning Hub is a free, self-paced library of courses, workshops, and tutorials covering robotics, programming, the Internet of Things, 3D printing, and renewable energy. Designed specifically for Sri Lankan school students aged 12-18, every course is built by YICDVP mentors and tested with real students.</p>' +

  '<h2>Why a Learning Hub?</h2>' +
  '<p>Most online STEM courses assume university-level prerequisites or expensive lab equipment. The Learning Hub is different: every lesson is written for school students with access to standard, affordable components available in Sri Lanka. You can complete any course with kit that costs less than the price of a mid-range smartphone, and you can do it at your own pace, in English or Sinhala.</p>' +

  '<h2>Course Tracks</h2>' +

  '<h3>1. Introduction to Robotics</h3>' +
  '<p>Build your first 4-wheel robot, then upgrade it with sensors, an LCD display, and remote control. Covers DC motors, motor drivers, ultrasonic sensors, line-following sensors, and basic chassis design. No prior electronics experience required.</p>' +

  '<h3>2. Arduino Programming</h3>' +
  '<p>From blinking your first LED to building a self-contained weather station. Covers the Arduino IDE, C/C++ basics, digital and analog I/O, serial communication, libraries, and how to debug real-world circuits.</p>' +

  '<h3>3. IoT Sensor Projects with ESP32</h3>' +
  '<p>Build connected devices that send real sensor data to the cloud. Covers WiFi, MQTT, cloud dashboards, environmental sensors (DHT22, soil moisture, air quality), and over-the-air firmware updates. By the end you will have a deployed IoT project anyone can view online.</p>' +

  '<h3>4. Web Development Fundamentals</h3>' +
  '<p>HTML, CSS, JavaScript, and modern web frameworks - taught through small, shippable projects. Designed for students who want to build the dashboards and apps that complement their hardware projects.</p>' +

  '<h3>5. 3D Printing &amp; CAD Design</h3>' +
  '<p>Learn Fusion 360 and FreeCAD basics, design printable parts, and produce them on our maker-space printers. Covers fundamentals of FDM printing, support structures, tolerances, and material selection.</p>' +

  '<h3>6. Solar Energy &amp; Renewable Systems</h3>' +
  '<p>Build solar-powered devices for real-world Sri Lankan use cases - water pumps, off-grid lighting, irrigation timers, and sensor stations. Covers PV cells, charge controllers, battery storage, and load calculations.</p>' +

  '<h3>7. Python Programming</h3>' +
  '<p>Modern Python for data, automation, and AI experiments. Includes a final mini-project where you train and deploy a simple machine-learning model on data you collect yourself.</p>' +

  '<h3>8. Embedded C &amp; Microcontrollers</h3>' +
  '<p>For students ready to go deeper - pure embedded C on AVR/STM32, low-level peripheral programming, real-time constraints, and the foundations of how production firmware actually works.</p>' +

  '<h2>How It Works</h2>' +
  '<ul>' +
  '<li><strong>Free for all Dharmapala Vidyalaya students</strong> - partner-school students can request access</li>' +
  '<li><strong>Self-paced</strong> - start any time, finish at your own speed</li>' +
  '<li><strong>Hands-on assignments</strong> - every lesson ends with a real thing to build, not just a quiz</li>' +
  '<li><strong>Mentor support</strong> - get unstuck via the YICDVP community chat or weekly office hours</li>' +
  '<li><strong>Earn certificates</strong> - finish a track and receive a Learning Hub completion certificate signed by your mentors</li>' +
  '</ul>' +

  '<h2>Who Is It For?</h2>' +
  '<p>The Learning Hub is built for school students who are curious about how things work and want to actually build them. No previous experience is required for the introductory courses. If you have already built things on your own, you can jump straight into the advanced tracks.</p>' +

  '<p><a href="/student/login">Student sign-in</a> · <a href="/contact">Request access</a> · <a href="/projects">See what graduates build</a></p>'
);

PAGES["/privacy-policy"] = wrap(
  '<h1>Privacy Policy - Young Innovators Club</h1>' +
  '<p>This Privacy Policy describes how the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya (YICDVP) collects, uses, and protects personal information of website visitors, students, parents, and members.</p>' +
  '<h2>Information We Collect</h2><p>Contact details you submit through enrolment, contact, or feedback forms. Anonymous analytics about how visitors use this website. Cookies that remember your preferences.</p>' +
  '<h2>How We Use It</h2><p>To respond to your enquiries, manage your club membership, send event updates, and improve this website. We never sell or rent your personal data.</p>' +
  '<h2>Contact</h2><p>For any privacy-related question, please reach us via the <a href="/contact">Contact</a> page.</p>'
);

PAGES["/terms-of-service"] = wrap(
  '<h1>Terms of Service - Young Innovators Club</h1>' +
  '<p>These Terms of Service govern your use of the Young Innovators Club website (dvpyic.dpdns.org) and associated services. By accessing or using this site, you agree to these terms.</p>' +
  '<h2>Acceptable Use</h2><p>Use this site lawfully and in good faith. Do not attempt to compromise its security, scrape it abusively, or impersonate YICDVP or its members.</p>' +
  '<h2>Content &amp; Intellectual Property</h2><p>All project descriptions, photographs, articles, and curriculum on this site are © Young Innovators Club of Dharmapala Vidyalaya Pannipitiya unless otherwise marked. Re-use for educational, non-commercial purposes is generally welcome with attribution.</p>' +
  '<h2>Contact</h2><p>Questions about these terms? <a href="/contact">Contact us</a>.</p>'
);

/**
 * Per-path page metadata used by `injectPrerenderContent` to rewrite the
 * `<head>` of the served HTML for bot requests. This is the SINGLE source of
 * truth for the canonical title, description, and Open Graph tags that search
 * engines and social previews will see - independent of whether react-helmet
 * has hydrated yet, and independent of the static fallbacks in index.html.
 */
const PAGE_META: Record<string, {
  title: string;
  description: string;
  ogType?: "website" | "article";
}> = {
  "/": {
    title: "Young Innovators Club (YICDVP) | Dharmapala Vidyalaya Pannipitiya",
    description:
      "Young Innovators Club (YICDVP) - the flagship STEM society among Dharmapala Vidyalaya Pannipitiya clubs. Hands-on robotics, IoT, solar energy and 3D printing projects for students in Pannipitiya, Sri Lanka.",
    ogType: "website",
  },
  "/about": {
    title: "About YICDVP | Young Innovators Club at DVP",
    description:
      "About the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya (YICDVP) - Sri Lanka's premier school invention club, founded 2020. 100+ members, 50+ projects, 15+ awards.",
    ogType: "website",
  },
  "/projects": {
    title: "Innovation Projects | YICDVP",
    description:
      "Explore the portfolio of student-built innovation projects from the Young Innovators Club - robotics, IoT, solar energy, 3D printing, and software.",
    ogType: "website",
  },
  "/blog": {
    title: "Innovation Blog | YICDVP",
    description:
      "Student-written articles, project deep-dives, tutorials, competition recaps, and STEM insights from the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya.",
    ogType: "website",
  },
  "/news": {
    title: "Newsroom | YICDVP",
    description:
      "Live announcements, competition results, and event coverage from the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya.",
    ogType: "website",
  },
  "/events": {
    title: "Events & Workshops | YICDVP",
    description:
      "Hands-on workshops, weekend hackathons, robotics tournaments, and inter-school STEM competitions from the Young Innovators Club at Dharmapala Vidyalaya.",
    ogType: "website",
  },
  "/team": {
    title: "Our Team | YICDVP",
    description:
      "Meet the students, teachers, and alumni mentors who lead the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya.",
    ogType: "website",
  },
  "/leadership": {
    title: "Leadership | YICDVP",
    description:
      "The elected student leadership, project captains, and teacher advisors of the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya.",
    ogType: "website",
  },
  "/gallery": {
    title: "Gallery | YICDVP",
    description:
      "Photos and videos from workshops, projects, competitions, and hackathons at the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya.",
    ogType: "website",
  },
  "/learning-hub": {
    title: "STEM Learning Hub | YICDVP",
    description:
      "Free, self-paced courses on robotics, programming, IoT, 3D printing, and renewable energy - designed for Sri Lankan school students.",
    ogType: "website",
  },
  "/contact": {
    title: "Contact Us | YICDVP",
    description:
      "Get in touch with the Young Innovators Club at Dharmapala Vidyalaya Pannipitiya. Join the club, propose a collaboration, or volunteer as a mentor.",
    ogType: "website",
  },
  "/privacy-policy": {
    title: "Privacy Policy | YICDVP",
    description:
      "Privacy policy of the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya. How we collect, use, and protect personal information.",
    ogType: "website",
  },
  "/terms-of-service": {
    title: "Terms of Service | YICDVP",
    description:
      "Terms of service for the Young Innovators Club website at dvpyic.dpdns.org and its associated services.",
    ogType: "website",
  },
};

const SITE_URL = "https://dvpyic.dpdns.org";
const SITE_NAME = "Young Innovators Club";
/**
 * Social preview banner (1200x630) generated by scripts/build-og-banner.mjs.
 * The 512x512 club-logo.png remains the in-app logo; the landscape banner is
 * the og:image because large cards get more clicks and Google/Bing prefer
 * 16:9 preview images.
 */
const DEFAULT_OG_IMAGE = "https://dvpyic.dpdns.org/assets/og-yicdvp-banner.png";
const DEFAULT_OG_IMAGE_ALT =
  "Young Innovators Club - STEM, Robotics and IoT at Dharmapala Vidyalaya Pannipitiya";

/** Human page names for the per-route BreadcrumbList injected into bot HTML. */
const CRUMB_NAMES: Record<string, string> = {
  "/": "Home",
  "/about": "About",
  "/projects": "Projects",
  "/blog": "Blog",
  "/news": "Newsroom",
  "/events": "Events & Workshops",
  "/team": "Team",
  "/leadership": "Leadership",
  "/gallery": "Gallery",
  "/contact": "Contact",
  "/learning-hub": "STEM Learning Hub",
  "/privacy-policy": "Privacy Policy",
  "/terms-of-service": "Terms of Service",
};

/**
 * Per-path JSON-LD blocks injected into the bot-served <head>, on top of the
 * static Organization/WebSite/BreadcrumbList scripts already in index.html.
 *
 * The FAQPage schema is normally added client-side by Index.tsx via
 * react-helmet-async, but the Worker strips the React module script for bot
 * user-agents, so crawlers would never see it. Mirroring it here (from the
 * same shared faqItems source the React FAQ renders) keeps bot HTML and user
 * HTML in sync.
 *
 * Values are serialized with JSON.stringify and `<` is escaped so no payload
 * can close the <script> tag early.
 */
const EXTRA_JSON_LD: Record<string, Record<string, unknown>> = {
  "/": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
};

function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Escape an HTML attribute value (only what's needed: & " < >).
 * Used when we splice page metadata into a string-built <head>.
 */
/** Escapes a value for a double-quoted HTML attribute (meta content, links). */
export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Per-head metadata that both prerender paths write into the bot HTML. */
interface HeadMeta {
  title: string;
  description: string;
  canonical: string;
  ogType: "website" | "article" | "profile";
  image: string;
  imageAlt: string;
  articlePublished?: string;
  articleModified?: string;
  articleSection?: string | null;
}

/** Property-style meta tag attributes - react-helmet sets the same ones for users. */
function addHeadMeta(
  injected: string,
  meta: HeadMeta
): string {
  const safeTitle = escapeAttr(meta.title);
  const safeDesc = escapeAttr(meta.description);
  const safeUrl = escapeAttr(meta.canonical);
  const safeImage = escapeAttr(meta.image);
  const safeImageAlt = escapeAttr(meta.imageAlt);
  const safeSiteName = escapeAttr(SITE_NAME);

  // Rewrite the <title>: if a static <title> exists in the served HTML, replace
  // it. If the static one has been removed (per the index.html cleanup), the
  // regex no-ops and we fall back to inserting a single canonical <title>
  // before </head>. Either way the bot sees exactly one title, sourced from
  // PAGE_META / the blog post, including the "Dharmapala Vidyalaya" tokens.
  const titleTag = `<title>${safeTitle}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(injected)) {
    injected = injected.replace(/<title>[\s\S]*?<\/title>/i, titleTag);
  } else {
    injected = injected.replace("</head>", `${titleTag}</head>`);
  }

  // Same pattern for <meta name="description">: replace if present, insert if
  // missing. The dedupe regex afterwards handles any "stray" duplicates.
  const descTag = `<meta name="description" content="${safeDesc}" />`;
  if (/<meta\s+name="description"[^>]*>/i.test(injected)) {
    injected = injected.replace(/<meta\s+name="description"[^>]*>/i, descTag);
  } else {
    injected = injected.replace("</head>", `${descTag}</head>`);
  }
  // If a stray second description slipped in, remove it.
  injected = injected.replace(
    /(<meta\s+name="description"[^>]*>\s*){2,}/gi,
    descTag
  );

  // Canonical: replace if the served HTML still carries one, otherwise insert.
  // index.html no longer ships a static canonical (it would have applied the
  // homepage URL to every route), so the insert branch is the normal path.
  const canonicalTag = `<link rel="canonical" href="${safeUrl}" />`;
  if (/<link\s+rel="canonical"[^>]*>/i.test(injected)) {
    injected = injected.replace(/<link\s+rel="canonical"[^>]*>/i, canonicalTag);
  } else {
    injected = injected.replace("</head>", `${canonicalTag}</head>`);
  }
  // Drop any stray duplicate canonical so bots see exactly one.
  injected = injected.replace(
    /(<link\s+rel="canonical"[^>]*>\s*){2,}/gi,
    canonicalTag
  );

  // Rewrite og:title / og:description / og:url and dedupe.
  injected = injected.replace(
    /<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  injected = injected.replace(
    /<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  injected = injected.replace(
    /<meta\s+property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${safeUrl}" />`
  );
  injected = injected.replace(
    /<meta\s+property="og:type"[^>]*>/i,
    `<meta property="og:type" content="${meta.ogType}" />`
  );
  injected = injected.replace(
    /<meta\s+property="og:site_name"[^>]*>/i,
    `<meta property="og:site_name" content="${safeSiteName}" />`
  );
  injected = injected.replace(
    /<meta\s+property="og:image"[^>]*>/i,
    `<meta property="og:image" content="${safeImage}" />`
  );
  injected = injected.replace(
    /<meta\s+property="og:image:alt"[^>]*>/i,
    `<meta property="og:image:alt" content="${safeImageAlt}" />`
  );
  // index.html statically declares og:image dims/type for the 1200x630 PNG
  // banner. Once og:image is rewritten to a blog cover of unknown size or
  // format those declarations are simply WRONG (platforms crop with them),
  // so keep them corrected for the known banner and strip them otherwise.
  if (meta.image === DEFAULT_OG_IMAGE) {
    injected = injected
      .replace(/<meta\s+property="og:image:width"[^>]*>/i, `<meta property="og:image:width" content="1200" />`)
      .replace(/<meta\s+property="og:image:height"[^>]*>/i, `<meta property="og:image:height" content="630" />`)
      .replace(/<meta\s+property="og:image:type"[^>]*>/i, `<meta property="og:image:type" content="image/png" />`);
  } else {
    injected = injected
      .replace(/<meta\s+property="og:image:width"[^>]*>\s*/i, "")
      .replace(/<meta\s+property="og:image:height"[^>]*>\s*/i, "")
      .replace(/<meta\s+property="og:image:type"[^>]*>\s*/i, "");
  }
  injected = injected.replace(
    /<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  injected = injected.replace(
    /<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );
  injected = injected.replace(
    /<meta\s+name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${safeImage}" />`
  );
  injected = injected.replace(
    /<meta\s+name="twitter:image:alt"[^>]*>/i,
    `<meta name="twitter:image:alt" content="${safeImageAlt}" />`
  );

  // Article extras (blog posts only). Static fallbacks never carry these, so
  // plain insertion is safe.
  if (meta.ogType === "article") {
    const articleTags: string[] = [];
    if (meta.articlePublished) {
      articleTags.push(
        `<meta property="article:published_time" content="${escapeAttr(meta.articlePublished)}" />`
      );
    }
    if (meta.articleModified) {
      articleTags.push(
        `<meta property="article:modified_time" content="${escapeAttr(meta.articleModified)}" />`
      );
    }
    if (meta.articleSection) {
      articleTags.push(
        `<meta property="article:section" content="${escapeAttr(meta.articleSection)}" />`
      );
    }
    injected = injected.replace("</head>", articleTags.join("") + "</head>");
  }

  return injected;
}

/**
 * Strip bot-only regions in the served shell: the inline service-worker
 * registration, the deferred analytics loader, and the GTM noscript iframe.
 * The React module script is stripped separately below by attribute because
 * Vite's build moves the `<script type="module" src="/src/main.tsx">` from
 * <body> up to <head> (right after the JSON-LD FAQPage comment), which puts
 * it OUTSIDE the BOT-STRIP-START:react marker in the source. The marker is
 * kept in index.html for documentation, but the regex here doesn't rely on
 * it for the React script. JSON-LD scripts are preserved (ld+json is not
 * matched by the module-script regex). Regular browsers are unaffected
 * because these helpers only run for bot user agents.
 */
function stripBotRegions(injected: string): string {
  // Iterate to a fixpoint: a single replace pass could leave a "<script"
  // fragment when a stripped module tag contains further script markup.
  let previous;
  do {
    previous = injected;
    injected = injected.replace(
      /<script\s+type="module"[^>]*>[\s\S]*?<\/script>/gi,
      ""
    );
  } while (injected !== previous);
  return injected.replace(
    /<!--\s*BOT-STRIP-START:([a-z-]+)\s*-->[\s\S]*?<!--\s*BOT-STRIP-END:\1\s*-->/gi,
    ""
  );
}

/** Insert JSON-LD blocks right before </head>, after the static blocks. */
function injectJsonLdBlocks(
  injected: string,
  blocks: Record<string, unknown>[]
): string {
  const payload = blocks
    .map((b) => `<script type="application/ld+json">${serializeJsonLd(b)}</script>`)
    .join("");
  return payload ? injected.replace("</head>", payload + "</head>") : injected;
}

/** Two-item crumb for a fixed page: Home > Page. Single-item crumbs (home) are skipped by callers. */
function breadcrumbJsonLd(path: string, name: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: `${SITE_URL}${path}`,
      },
    ],
  };
}

/**
 * Inject pre-rendered HTML into the response for bot requests.
 *
 * - Replaces <div id="root"></div> with the page's pre-rendered content.
 * - Rewrites the <head> with page-specific <title>, <meta name="description">,
 *   <link rel="canonical">, and Open Graph + Twitter Card tags derived from
 *   PAGE_META. This ensures JS-disabled crawlers (and crawlers that capture
 *   the page during Helmet's hydration window) get exactly one canonical
 *   title and one canonical description per route - no duplicates.
 * - Injects per-path JSON-LD: the FAQPage block on the homepage and a
 *   correct Home > Page BreadcrumbList for every other fixed route.
 *
 * Returns `{ response, injected }` so callers only apply bot-cache headers
 * when prerender content was actually served. If the path is not in PAGES,
 * `injected` is false and the response is returned untouched.
 */
export async function injectPrerenderContent(
  response: Response,
  pathname: string
): Promise<{ response: Response; injected: boolean }> {
  // Normalize path - strip trailing slash
  const path = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  const content = PAGES[path];
  const meta = PAGE_META[path];

  if (!content) {
    // No pre-render content for this path; return original
    return { response, injected: false };
  }

  const html = await response.text();
  const canonicalUrl = `${SITE_URL}${path === "/" ? "/" : path}`;
  const title = meta?.title ?? `${SITE_NAME} | STEM & Robotics at DVP`;
  const description =
    meta?.description ??
    "Young Innovators Club (YICDVP) at Dharmapala Vidyalaya Pannipitiya - Sri Lanka's premier school invention club.";
  const ogType = meta?.ogType ?? "website";

  // Replace the empty root with pre-rendered content
  let injected = html.replace(
    '<div id="root"></div>',
    `<div id="root">${content}</div>`
  );

  injected = addHeadMeta(injected, {
    title,
    description,
    canonical: canonicalUrl,
    ogType,
    image: DEFAULT_OG_IMAGE,
    imageAlt: DEFAULT_OG_IMAGE_ALT,
  });

  // Strip bot-only regions marked in index.html. See stripBotRegions above.
  injected = stripBotRegions(injected);

  // Per-path JSON-LD: the shared-source FAQPage on the homepage (normally
  // added client-side by Index.tsx via react-helmet-async, but the React
  // module script is stripped for bots, so it is mirrored here) plus the
  // per-route breadcrumb. Home gets no crumb: a one-item BreadcrumbList is
  // not valid for display.
  const blocks: Record<string, unknown>[] = [];
  const extraLd = EXTRA_JSON_LD[path];
  if (extraLd) blocks.push(extraLd);
  const crumbName = CRUMB_NAMES[path];
  if (crumbName && path !== "/") blocks.push(breadcrumbJsonLd(path, crumbName));
  injected = injectJsonLdBlocks(injected, blocks);

  return {
    response: new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
    injected: true,
  };
}

/* ------------------------------------------------------------------ */
/*  Blog post prerender (/blog/:slug)                                  */
/* ------------------------------------------------------------------ */

/**
 * SEO metadata for one published blog post, loaded by the Worker (D1 cache
 * with a Supabase fallback). Only published rows are ever exposed, so drafts
 * cannot leak into bot-served HTML.
 */
export interface BlogPostSeoMeta {
  title: string;
  excerpt: string;
  coverImageUrl: string;
  publishedAt: string;
  updatedAt: string;
  authorName: string;
  category: string | null;
}

/**
 * Serve real, per-post HTML for `/blog/:slug` to crawlers that do not execute
 * JavaScript (Bing, Yandex, DuckDuckGo, Facebook, LinkedIn, WhatsApp, ...).
 *
 * Previously these bots received the bare SPA shell: no title, the homepage
 * Open Graph card from index.html, and no structured data - which meant social
 * shares of blog links showed generic previews and non-Google engines indexed
 * nothing. This function injects:
 *   - the post's own <title>, description, and canonical URL
 *   - article Open Graph tags with the post's cover image
 *   - BlogPosting + Home > Blog > post title JSON-LD
 *   - a visible h1/excerpt/link body inside <div id="root"> for JS-less bots
 *
 * Returns the untouched response when `post` is null (unknown or unpublished
 * slug) so the caller keeps the bare-shell cache behaviour.
 */
export async function injectBlogPostPrerender(
  response: Response,
  slug: string,
  post: BlogPostSeoMeta | null
): Promise<{ response: Response; injected: boolean }> {
  if (!post) return { response, injected: false };

  const html = await response.text();
  const canonicalUrl = `${SITE_URL}/blog/${encodeURIComponent(slug)}`;

  const title = post.title;
  const description =
    post.excerpt || `Read "${title}" on the Young Innovators Club blog.`;
  // Only absolute https images are safe to hand to social scrapers.
  let image = DEFAULT_OG_IMAGE;
  if (/^https?:\/\/[\w.-]+/.test(post.coverImageUrl)) {
    image = post.coverImageUrl;
  } else if (post.coverImageUrl.startsWith("/")) {
    image = `${SITE_URL}${post.coverImageUrl}`;
  }

  // Light JS-free body - crawlers read the h1 + excerpt and can follow the
  // link back to the blog index. The full article body stays in the React app.
  const body =
    `<section><h1>${escapeAttr(title)}</h1>` +
    (post.excerpt ? `<p>${escapeAttr(post.excerpt)}</p>` : "") +
    (post.category ? `<p><em>${escapeAttr(post.category)}</em></p>` : "") +
    `<p><a href="/blog">More articles from the Young Innovators Club</a></p></section>`;

  let injected = html
    .replace('<div id="root"></div>', `<div id="root">${wrap(body)}</div>`);

  injected = addHeadMeta(injected, {
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical: canonicalUrl,
    ogType: "article",
    image,
    imageAlt: title,
    articlePublished: post.publishedAt,
    articleModified: post.updatedAt,
    articleSection: post.category,
  });

  injected = stripBotRegions(injected);

  const cleanTitle = stripHtmlText(post.title);
  const publishingBlock: Record<string, unknown> = {
    "@type": "Organization",
    name: SITE_NAME,
    logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
  };
  const blogPosting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: cleanTitle,
    description,
    url: canonicalUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    image,
    author: { "@type": "Person", name: stripHtmlText(post.authorName || "") },
    publisher: publishingBlock,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
  };
  if (post.category) blogPosting.articleSection = post.category;

  injected = injectJsonLdBlocks(injected, [
    blogPosting,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: cleanTitle, item: canonicalUrl },
      ],
    },
  ]);

  return {
    response: new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
    injected: true,
  };
}

/* ------------------------------------------------------------------ */
/*  Instructor profile prerender (/learning-hub/instructor/:slug)      */
/* ------------------------------------------------------------------ */

/**
 * SEO metadata for one public instructor profile, loaded by the Worker (D1
 * cache with a Supabase RPC fallback). Derived identity only — the instructor
 * slug matches slugify_text(instructor) over published courses; unknown or
 * course-less slugs return null and keep the bare-shell behaviour.
 */
export interface InstructorSeoMeta {
  name: string;
  bio: string;
  avatarUrl: string;
  courseCount: number;
  totalStudents: number;
  avgRating: number | null;
  courses: { title: string; slug: string }[];
}

/**
 * Serve real, per-instructor HTML for `/learning-hub/instructor/:slug` to
 * crawlers that do not execute JavaScript (same reason as /blog/:slug).
 * Injects:
 *   - the instructor's own <title>, description, and canonical URL
 *   - profile Open Graph tags with the avatar when it is an absolute URL
 *   - ProfilePage (mainEntity: Person) + Home > Learning Hub > name JSON-LD
 *   - a visible h1/bio/course-links body inside <div id="root"> for JS-less bots
 *
 * Returns the untouched response when `meta` is null so the caller keeps the
 * bare-shell cache behaviour.
 */
export async function injectInstructorPrerender(
  response: Response,
  slug: string,
  meta: InstructorSeoMeta | null
): Promise<{ response: Response; injected: boolean }> {
  if (!meta) return { response, injected: false };

  const html = await response.text();
  const canonicalUrl = `${SITE_URL}/learning-hub/instructor/${encodeURIComponent(slug)}`;

  const name = stripHtmlText(meta.name) || "Instructor";
  const bio = stripHtmlText(meta.bio);
  const description =
    bio.slice(0, 160) ||
    `Courses by ${name} on the SPARK Labs Learning Hub — free STEM courses from the Young Innovators Club.`;
  // Only absolute https images are safe to hand to social scrapers.
  let image = DEFAULT_OG_IMAGE;
  if (/^https?:\/\/[\w.-]+/.test(meta.avatarUrl)) {
    image = meta.avatarUrl;
  } else if (meta.avatarUrl.startsWith("/")) {
    image = `${SITE_URL}${meta.avatarUrl}`;
  }

  // Light JS-free body: h1 + bio + aggregates + course links crawlers can
  // follow back into the catalogue. The full profile stays in the React app.
  const statParts: string[] = [
    `${meta.courseCount} published course${meta.courseCount === 1 ? "" : "s"}`,
    `${meta.totalStudents.toLocaleString("en-US")} ${
      meta.totalStudents === 1 ? "student" : "students"
    }`,
  ];
  if (meta.avgRating && meta.avgRating > 0) {
    statParts.push(`${meta.avgRating.toFixed(1)} instructor rating`);
  }
  const courseLinks = meta.courses
    .map(
      (c) =>
        `<li><a href="/learning-hub/course/${encodeURIComponent(c.slug)}">${escapeAttr(
          stripHtmlText(c.title)
        )}</a></li>`
    )
    .join("");

  const body =
    `<section><h1>${escapeAttr(name)}</h1>` +
    (bio ? `<p>${escapeAttr(bio)}</p>` : "") +
    `<p><em>${escapeAttr(statParts.join(" · "))}</em></p>` +
    (courseLinks ? `<ul>${courseLinks}</ul>` : "") +
    `<p><a href="/learning-hub">Browse all courses from the Young Innovators Club</a></p></section>`;

  let injected = html
    .replace('<div id="root"></div>', `<div id="root">${wrap(body)}</div>`);

  injected = addHeadMeta(injected, {
    title: `${name} | Instructor | ${SITE_NAME}`,
    description,
    canonical: canonicalUrl,
    ogType: "profile",
    image,
    imageAlt: name,
  });

  injected = stripBotRegions(injected);

  const person: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: canonicalUrl,
  };
  if (bio) person.description = description;
  if (image !== DEFAULT_OG_IMAGE) person.image = image;
  const courseList = meta.courses
    .filter((c) => c.slug.length > 0)
    .slice(0, 20)
    .map((c) => ({
      "@type": "ListItem",
      position: 0,
      item: {
        "@type": "Course",
        name: stripHtmlText(c.title),
        url: `${SITE_URL}/learning-hub/course/${encodeURIComponent(c.slug)}`,
      },
    }));
  if (courseList.length > 0) {
    courseList.forEach((item, i) => {
      item.position = i + 1;
    });
    person.hasCourse = { "@type": "ItemList", itemListElement: courseList };
  }

  injected = injectJsonLdBlocks(injected, [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "@id": canonicalUrl,
      url: canonicalUrl,
      mainEntity: person,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "Learning Hub",
          item: `${SITE_URL}/learning-hub`,
        },
        { "@type": "ListItem", position: 3, name, item: canonicalUrl },
      ],
    },
  ]);

  return {
    response: new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
    injected: true,
  };
}

/* ------------------------------------------------------------------ */
/*  Generic dynamic-entity prerender (/project/:id, course, workshop)  */
/* ------------------------------------------------------------------ */

/** Loader-composed metadata for one dynamic detail page. */
export interface EntitySeoMeta {
  /** Page title WITHOUT the site suffix — the injector appends ` | ${SITE_NAME}`. */
  title: string;
  description: string;
  /** Absolute or site-relative image; "" selects the default OG banner. */
  imageUrl: string;
  ogType: "website" | "article";
  /** Breadcrumbs for JSON-LD; the Home crumb comes first. */
  breadcrumbs: { name: string; item: string }[];
  /** JS-free visible body for the #root div (loader escapes all fields). */
  bodyHtml: string;
  /** Extra schema.org blocks beyond the breadcrumb list (already @contexted). */
  jsonLdBlocks: Record<string, unknown>[];
}

/**
 * Shared injector for dynamic detail routes without a bespoke renderer
 * (projects / courses / workshops). Same contract as injectBlogPostPrerender
 * and injectInstructorPrerender: a null meta keeps the bare-shell cache
 * behaviour (injected: false), so unknown slugs stay noindex-by-absence.
 */
export async function injectEntityPrerender(
  response: Response,
  canonicalPath: string,
  meta: EntitySeoMeta | null
): Promise<{ response: Response; injected: boolean }> {
  if (!meta) return { response, injected: false };

  const html = await response.text();
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  // Only absolute https images are safe to hand to social scrapers.
  let image = DEFAULT_OG_IMAGE;
  if (/^https?:\/\/[\w.-]+/.test(meta.imageUrl)) {
    image = meta.imageUrl;
  } else if (meta.imageUrl.startsWith("/")) {
    image = `${SITE_URL}${meta.imageUrl}`;
  }

  let injected = html
    .replace('<div id="root"></div>', `<div id="root">${wrap(meta.bodyHtml)}</div>`);

  injected = addHeadMeta(injected, {
    title: `${stripHtmlText(meta.title)} | ${SITE_NAME}`,
    description: stripHtmlText(meta.description),
    canonical: canonicalUrl,
    ogType: meta.ogType,
    image,
    imageAlt: stripHtmlText(meta.title),
  });

  injected = stripBotRegions(injected);

  injected = injectJsonLdBlocks(injected, [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: meta.breadcrumbs.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: stripHtmlText(crumb.name),
        item: crumb.item,
      })),
    },
    ...meta.jsonLdBlocks,
  ]);

  return {
    response: new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
    injected: true,
  };
}

/**
 * Reduce a field to plain text for JSON-LD strings, meta content and the
 * prerendered body: the shared iterative stripper (defeats nesting like
 * "<scr<script>ipt>", which resurrects a tag after a single replace pass),
 * then every residual angle bracket is removed so no tag-like sequence -
 * including "script" - can survive into any head/body sink.
 */
function stripHtmlText(value: string): string {
  return stripHtmlTags(value).replace(/[<>]/g, "").trim();
}
