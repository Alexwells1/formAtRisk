const https = require("https");
const querystring = require("querystring");

// ============================================================
// CONSTANTS — edit these freely
// ============================================================
const FORM_ID = "1FAIpQLSdGU63cK8o0RDUxKSqKWJyhBb4T6eQC1IUhw2cjPScXMuUguQ";
const TOTAL_RESPONSES = 1000;

// Random delay bounds (milliseconds)
// 30–50 responses/hour = 72s–120s average gap
// We use a wide random range that averages in that window
const DELAY_MIN_MS =  2000;   // 2 seconds  (fastest burst)
const DELAY_MAX_MS = 600000;  // 10 minutes (longest pause)
// To stay ≥30/hr the script self-corrects: if it's running slow it shortens delays

// Target throughput band (responses per hour)
const MIN_RATE = 30;
const MAX_RATE = 50;

const DISTRIBUTION = {
  NOT_AT_RISK:   Math.round(TOTAL_RESPONSES * 0.30),
  MODERATE_RISK: Math.round(TOTAL_RESPONSES * 0.40),
  AT_RISK:       Math.round(TOTAL_RESPONSES * 0.30),
};

// ============================================================
// FIELD IDs
// ============================================================
const F = {
  DEPARTMENT:            "entry.698789917",
  GENDER:                "entry.1659763166",
  LEVEL:                 "entry.1250415932",
  CGPA:                  "entry.1485466938",
  PARENT_EDUCATION:      "entry.1660937077",
  FINANCIAL_CHALLENGES:  "entry.1076060942",
  INTERNET_ACCESS:       "entry.1739812924",
  ELECTRICITY_ISSUES:    "entry.814693417",
  ATTENDANCE:            "entry.985438748",
  ASSIGNMENT_SUBMISSION: "entry.1654264532",
  STUDY_HOURS:           "entry.1187571751",
  STUDY_SCHEDULE:        "entry.1322392457",
  PROCRASTINATION:       "entry.723355431",
  PEER_INFLUENCE:        "entry.1497619785",
  COURSE_DIFFICULTY:     "entry.46677698",
  DISTRACTION:           "entry.1013279790",
  STRESS:                "entry.1503731386",
  MISSED_ASSESSMENTS:    "entry.1642173318",
  CARRYOVERS:            "entry.1420102139",
  PROBATION:             "entry.1612551183",
  WITHDRAWAL:            "entry.1735020740",
  PERFORMANCE_RATING:    "entry.264996985",
  PART_TIME_WORK:        "entry.1734738087",
  WORK_HOURS:            "entry.925308420",
  EXTRACURRICULAR:       "entry.631810206",
  WILLING_INTERVENTION:  "entry.1506269894",
};

// ============================================================
// OPTION POOLS
// ============================================================
const DEPARTMENTS = [
  "Data Science", "Computer Science", "Software Engineering",
  "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
  "Chemical Engineering", "Petroleum Engineering", "Biochemistry",
  "Microbiology", "Pharmacology", "Medicine and Surgery",
  "Veterinary Medicine", "Animal Science", "Agricultural Science",
  "Food Science and Technology", "Environmental Science",
  "Geology", "Physics", "Mathematics", "Statistics",
  "Economics", "Accounting", "Business Administration",
  "Finance", "Marketing", "Architecture","ift", "ets", "csc", "fst",
  "Library and Information Science", "chm","AERD", "biochemistry", "microbiology", 
];

const LIKERT = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

// ============================================================
// HELPERS
// ============================================================
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(options, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

function likert(w) {
  return weightedPick(LIKERT, w);
}

function randFbzx() {
  const sign = Math.random() > 0.5 ? 1 : -1;
  const val  = Math.floor(Math.random() * 9e15);
  return (sign * val).toString();
}

// ============================================================
// SMART RANDOM DELAY
// Picks a random delay but checks current actual rate.
// If we're below MIN_RATE it shortens; if above MAX_RATE it lengthens.
// Otherwise it picks freely between DELAY_MIN_MS and DELAY_MAX_MS.
// ============================================================
function getNextDelay(submittedSoFar, elapsedMs) {
  const hoursElapsed = elapsedMs / 3600000;
  const currentRate  = hoursElapsed > 0 ? submittedSoFar / hoursElapsed : 999;

  let minDelay, maxDelay;

  if (currentRate < MIN_RATE) {
    // Running too slow — keep delay short (2s – 30s)
    minDelay = DELAY_MIN_MS;
    maxDelay = 30000;
  } else if (currentRate > MAX_RATE) {
    // Running too fast — force a longer pause (2 min – 10 min)
    minDelay = 120000;
    maxDelay = DELAY_MAX_MS;
  } else {
    // In the sweet spot — full random range
    minDelay = DELAY_MIN_MS;
    maxDelay = DELAY_MAX_MS;
  }

  return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
}

function fmtMs(ms) {
  if (ms < 1000)  return `${ms}ms`;
  if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
  return `${(ms/60000).toFixed(1)}m`;
}

// ============================================================
// PROFILE GENERATORS
// ============================================================
function notAtRiskProfile() {
  const workPT = Math.random() < 0.2 ? "Yes" : "No";
  return {
    [F.GENDER]:               pick(["Male","Female"]),
    [F.LEVEL]:                pick(["100 Level","200 Level","300 Level","400 Level","500 Level","600 Level"]),
    [F.CGPA]:                 weightedPick(["3.50 – 4.49","4.50 – 5.00"],[60,40]),
    [F.PARENT_EDUCATION]:     weightedPick(["Yes","No"],[70,30]),
    [F.FINANCIAL_CHALLENGES]: likert([25,35,20,15,5]),
    [F.INTERNET_ACCESS]:      likert([3,7,10,40,40]),
    [F.ELECTRICITY_ISSUES]:   likert([20,30,25,15,10]),
    [F.ATTENDANCE]:           likert([2,3,10,40,45]),
    [F.ASSIGNMENT_SUBMISSION]:likert([2,3,10,40,45]),
    [F.STUDY_HOURS]:          weightedPick(["Less than 1 hour","1 – 2 hours","3 – 4 hours","5 – 6 hours","More than 6 hours"],[2,10,40,35,13]),
    [F.STUDY_SCHEDULE]:       weightedPick(["Always","Often","Sometimes","Rarely","Never"],[30,40,20,7,3]),
    [F.PROCRASTINATION]:      likert([35,35,15,10,5]),
    [F.PEER_INFLUENCE]:       likert([2,5,15,45,33]),
    [F.COURSE_DIFFICULTY]:    likert([25,35,25,10,5]),
    [F.DISTRACTION]:          likert([20,35,25,15,5]),
    [F.STRESS]:               likert([15,25,30,20,10]),
    [F.MISSED_ASSESSMENTS]:   likert([50,30,10,7,3]),
    [F.CARRYOVERS]:           weightedPick(["None","1 – 2","3 – 4","More than 4"],[80,15,4,1]),
    [F.PROBATION]:            weightedPick(["Yes","No"],[2,98]),
    [F.WITHDRAWAL]:           weightedPick(["Yes","No"],[5,95]),
    [F.PERFORMANCE_RATING]:   weightedPick(["Excellent","Very Good","Good","Fair","Poor"],[35,40,20,4,1]),
    [F.PART_TIME_WORK]:       workPT,
    [F.WORK_HOURS]:           workPT === "Yes" ? weightedPick(["Less than 5 hours","5 – 10 hours","11 – 20 hours","21 – 30 hours","More than 30 hours"],[40,40,15,4,1]) : "Not Applicable",
    [F.EXTRACURRICULAR]:      weightedPick(["Yes","No"],[55,45]),
    [F.WILLING_INTERVENTION]: weightedPick(["Yes","No"],[90,10]),
  };
}

function moderateRiskProfile() {
  const workPT = Math.random() < 0.35 ? "Yes" : "No";
  return {
    [F.GENDER]:               pick(["Male","Female"]),
    [F.LEVEL]:                pick(["100 Level","200 Level","300 Level","400 Level","500 Level","600 Level"]),
    [F.CGPA]:                 weightedPick(["2.40 – 3.49","3.50 – 4.49"],[70,30]),
    [F.PARENT_EDUCATION]:     weightedPick(["Yes","No"],[55,45]),
    [F.FINANCIAL_CHALLENGES]: likert([10,20,25,30,15]),
    [F.INTERNET_ACCESS]:      likert([5,15,20,35,25]),
    [F.ELECTRICITY_ISSUES]:   likert([10,15,25,30,20]),
    [F.ATTENDANCE]:           likert([5,10,25,40,20]),
    [F.ASSIGNMENT_SUBMISSION]:likert([5,10,25,40,20]),
    [F.STUDY_HOURS]:          weightedPick(["Less than 1 hour","1 – 2 hours","3 – 4 hours","5 – 6 hours","More than 6 hours"],[5,30,40,20,5]),
    [F.STUDY_SCHEDULE]:       weightedPick(["Always","Often","Sometimes","Rarely","Never"],[10,25,40,20,5]),
    [F.PROCRASTINATION]:      likert([10,15,25,35,15]),
    [F.PEER_INFLUENCE]:       likert([5,15,25,35,20]),
    [F.COURSE_DIFFICULTY]:    likert([10,15,30,30,15]),
    [F.DISTRACTION]:          likert([5,15,25,35,20]),
    [F.STRESS]:               likert([5,15,25,35,20]),
    [F.MISSED_ASSESSMENTS]:   likert([15,25,30,20,10]),
    [F.CARRYOVERS]:           weightedPick(["None","1 – 2","3 – 4","More than 4"],[35,45,15,5]),
    [F.PROBATION]:            weightedPick(["Yes","No"],[15,85]),
    [F.WITHDRAWAL]:           weightedPick(["Yes","No"],[20,80]),
    [F.PERFORMANCE_RATING]:   weightedPick(["Excellent","Very Good","Good","Fair","Poor"],[5,20,45,25,5]),
    [F.PART_TIME_WORK]:       workPT,
    [F.WORK_HOURS]:           workPT === "Yes" ? weightedPick(["Less than 5 hours","5 – 10 hours","11 – 20 hours","21 – 30 hours","More than 30 hours"],[20,35,30,10,5]) : "Not Applicable",
    [F.EXTRACURRICULAR]:      weightedPick(["Yes","No"],[45,55]),
    [F.WILLING_INTERVENTION]: weightedPick(["Yes","No"],[80,20]),
  };
}

function atRiskProfile() {
  const workPT = Math.random() < 0.5 ? "Yes" : "No";
  return {
    [F.GENDER]:               pick(["Male","Female"]),
    [F.LEVEL]:                pick(["100 Level","200 Level","300 Level","400 Level","500 Level","600 Level"]),
    [F.CGPA]:                 weightedPick(["Below 1.50","1.50 – 2.39","2.40 – 3.49"],[30,50,20]),
    [F.PARENT_EDUCATION]:     weightedPick(["Yes","No"],[40,60]),
    [F.FINANCIAL_CHALLENGES]: likert([3,7,15,35,40]),
    [F.INTERNET_ACCESS]:      likert([15,25,25,25,10]),
    [F.ELECTRICITY_ISSUES]:   likert([3,7,15,35,40]),
    [F.ATTENDANCE]:           likert([20,30,25,15,10]),
    [F.ASSIGNMENT_SUBMISSION]:likert([20,30,25,15,10]),
    [F.STUDY_HOURS]:          weightedPick(["Less than 1 hour","1 – 2 hours","3 – 4 hours","5 – 6 hours","More than 6 hours"],[35,40,15,7,3]),
    [F.STUDY_SCHEDULE]:       weightedPick(["Always","Often","Sometimes","Rarely","Never"],[3,7,20,35,35]),
    [F.PROCRASTINATION]:      likert([3,7,15,35,40]),
    [F.PEER_INFLUENCE]:       likert([15,25,30,20,10]),
    [F.COURSE_DIFFICULTY]:    likert([3,7,15,40,35]),
    [F.DISTRACTION]:          likert([3,7,15,35,40]),
    [F.STRESS]:               likert([3,7,15,35,40]),
    [F.MISSED_ASSESSMENTS]:   likert([3,7,15,35,40]),
    [F.CARRYOVERS]:           weightedPick(["None","1 – 2","3 – 4","More than 4"],[5,20,35,40]),
    [F.PROBATION]:            weightedPick(["Yes","No"],[55,45]),
    [F.WITHDRAWAL]:           weightedPick(["Yes","No"],[50,50]),
    [F.PERFORMANCE_RATING]:   weightedPick(["Excellent","Very Good","Good","Fair","Poor"],[1,4,15,40,40]),
    [F.PART_TIME_WORK]:       workPT,
    [F.WORK_HOURS]:           workPT === "Yes" ? weightedPick(["Less than 5 hours","5 – 10 hours","11 – 20 hours","21 – 30 hours","More than 30 hours"],[5,15,30,30,20]) : "Not Applicable",
    [F.EXTRACURRICULAR]:      weightedPick(["Yes","No"],[30,70]),
    [F.WILLING_INTERVENTION]: weightedPick(["Yes","No"],[65,35]),
  };
}

// ============================================================
// BUILD & SHUFFLE POOL
// ============================================================
function buildPool() {
  const pool = [];
  for (let i = 0; i < DISTRIBUTION.NOT_AT_RISK;   i++) pool.push({ cls: "Not At Risk",   fn: notAtRiskProfile });
  for (let i = 0; i < DISTRIBUTION.MODERATE_RISK; i++) pool.push({ cls: "Moderate Risk", fn: moderateRiskProfile });
  for (let i = 0; i < DISTRIBUTION.AT_RISK;        i++) pool.push({ cls: "At Risk",       fn: atRiskProfile });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// ============================================================
// SUBMIT
// ============================================================
function submitForm(fields) {
  return new Promise((resolve, reject) => {
    const fbzx = randFbzx();

    const payload = {
      ...fields,
      [F.DEPARTMENT]: pick(DEPARTMENTS),
      "fvv":                "1",
      "draftResponse":      `[null,null,"${fbzx}"]`,
      "pageHistory":        "0",
      "fbzx":               fbzx,
      "submissionTimestamp": Date.now().toString(),
    };

    Object.keys(payload)
      .filter(k => k.startsWith("entry."))
      .forEach(k => { payload[k + "_sentinel"] = ""; });

    const postData = querystring.stringify(payload);

    const options = {
      hostname: "docs.google.com",
      path: `/forms/u/0/d/e/${FORM_ID}/formResponse`,
      method: "POST",
      headers: {
        "Content-Type":    "application/x-www-form-urlencoded",
        "Content-Length":  Buffer.byteLength(postData),
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer":         `https://docs.google.com/forms/d/e/${FORM_ID}/viewform?fbzx=${fbzx}`,
        "Origin":          "https://docs.google.com",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection":      "keep-alive",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        const confirmed = body.includes("freebirdFormviewerViewResponseConfirmationMessage")
                       || body.includes("Your response has been recorded")
                       || body.includes("recordedAnswer");
        resolve({ status: res.statusCode, confirmed, location: res.headers["location"] });
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const pool  = buildPool();
  const stats = { success: 0, confirmed: 0, failed: 0, notAtRisk: 0, moderateRisk: 0, atRisk: 0 };
  const start = Date.now();

  console.log("=".repeat(68));
  console.log("  Google Form Synthetic Response Submitter");
  console.log(`  Target : ${TOTAL_RESPONSES} responses`);
  console.log(`  Rate   : ${MIN_RATE}–${MAX_RATE} responses/hour (self-correcting random delay)`);
  console.log(`  Delay  : ${fmtMs(DELAY_MIN_MS)} – ${fmtMs(DELAY_MAX_MS)} randomly`);
  console.log(`  Split  : ${JSON.stringify(DISTRIBUTION)}`);
  console.log("=".repeat(68));

  for (let i = 0; i < pool.length; i++) {
    const { cls, fn } = pool[i];
    const profile = fn();

    try {
      const { status, confirmed, location } = await submitForm(profile);
      const ok = confirmed || status === 302 || (location && location.includes("formResponse"));

      if (ok) {
        stats.success++;
        stats.confirmed++;
        if (cls === "Not At Risk")   stats.notAtRisk++;
        if (cls === "Moderate Risk") stats.moderateRisk++;
        if (cls === "At Risk")       stats.atRisk++;
      } else {
        stats.failed++;
      }

      const elapsed     = Date.now() - start;
      const elapsedSec  = (elapsed / 1000).toFixed(0);
      const pct         = (((i + 1) / pool.length) * 100).toFixed(1);
      const hoursElapsed = elapsed / 3600000;
      const rate        = hoursElapsed > 0 ? (stats.confirmed / hoursElapsed).toFixed(1) : "–";
      const icon        = ok ? "✓" : "✗";
      const note        = confirmed ? "confirmed" : `HTTP ${status}${location ? " →" : ""}`;

      // Calculate and announce next delay
      if (i < pool.length - 1) {
        const nextDelay = getNextDelay(stats.confirmed, elapsed);
        console.log(`[${String(i+1).padStart(4,"0")}/${pool.length}] ${icon} ${cls.padEnd(14)} | ${note.padEnd(12)} | ${pct}% | ${elapsedSec}s | rate:${rate}/hr | next delay: ${fmtMs(nextDelay)}`);
        await sleep(nextDelay);
      } else {
        console.log(`[${String(i+1).padStart(4,"0")}/${pool.length}] ${icon} ${cls.padEnd(14)} | ${note.padEnd(12)} | ${pct}% | ${elapsedSec}s | rate:${rate}/hr`);
      }

    } catch (err) {
      stats.failed++;
      console.error(`[${i+1}] ✗ ERROR: ${err.message}`);
    }
  }

  const mins = ((Date.now() - start) / 60000).toFixed(1);
  console.log("\n" + "=".repeat(68));
  console.log("SUMMARY");
  console.log("=".repeat(68));
  console.log(`✓ Confirmed  : ${stats.confirmed}`);
  console.log(`✗ Failed     : ${stats.failed}`);
  console.log(`  Not At Risk    : ${stats.notAtRisk}`);
  console.log(`  Moderate Risk  : ${stats.moderateRisk}`);
  console.log(`  At Risk        : ${stats.atRisk}`);
  console.log(`  Total time     : ${mins} minutes`);
  console.log("=".repeat(68));
}

main().catch(console.error);