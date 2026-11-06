// Learning Hub course-duration parser.
//
// `learning_courses.duration` is admin free text ("5h 30m", "45 minutes",
// "2h", "3 Hours"). Only the Learning Hub's Udemy-style short/medium/long
// filter needs a numeric value, so parsing lives here — outside the page
// component, both for react-refresh hygiene and for direct unit testing.
// Unparseable values return null; the caller decides what those mean
// ("Any duration" only, per the Learning Hub filter contract).

const HOURS_RE = /(\d+)\s*(?:h|hr|hour)/i;
const MINUTES_RE = /(\d+)\s*(?:m|min|minute)/i;

export function durationToMinutes(raw: string | null): number | null {
    if (!raw) return null;
    const h = HOURS_RE.exec(raw);
    const m = MINUTES_RE.exec(raw);
    if (!h && !m) return null;
    return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}
