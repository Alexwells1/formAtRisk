const https = require("https");
const http = require("http");
const querystring = require("querystring");

// ============================================================
// CONSTANTS — edit these freely
// ============================================================
const FORM_ID = "1FAIpQLSdGU63cK8o0RDUxKSqKWJyhBb4T6eQC1IUhw2cjPScXMuUguQ";
const TOTAL_RESPONSES = process.env.TOTAL_RESPONSES || 7000;

const DELAY_MIN_MS = 300000; // 5 minutes
const DELAY_MAX_MS = 3600000; // 1 hour

const MIN_RATE = 4000;
const MAX_RATE = 6000;

// Realistic distribution based on actual student populations
const DISTRIBUTION = {
  NOT_AT_RISK: Math.round(TOTAL_RESPONSES * 0.6), // 60% - majority of students
  MODERATE_RISK: Math.round(TOTAL_RESPONSES * 0.3), // 30% - significant minority
  AT_RISK: Math.round(TOTAL_RESPONSES * 0.1), // 10% - concerning but realistic
};

// Realistic gender ratio for Nigerian universities (slightly more males in STEM)
const GENDER_RATIO = {
  MALE: 0.62, // 62% male
  FEMALE: 0.38, // 38% female
};

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Form submitter is running\n");
  })
  .listen(PORT, () => {
    console.log(`[KEEPALIVE] HTTP server listening on port ${PORT}`);
    const selfUrl =
      process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    setInterval(() => {
      const client = selfUrl.startsWith("https") ? https : http;
      client
        .get(selfUrl, (r) => {
          console.log(`[PING OK] ${r.statusCode}`);
          r.resume();
        })
        .on("error", (err) => {
          console.error(`[PING ERROR] ${err.message}`);
        });
      console.log(`[PING] ${selfUrl}`);
    }, 3 * 60 * 1000);
  });

// ============================================================
// FIELD IDs
// ============================================================
const F = {
  DEPARTMENT: "entry.698789917",
  GENDER: "entry.1659763166",
  LEVEL: "entry.1250415932",
  CGPA: "entry.1485466938",
  PARENT_EDUCATION: "entry.1660937077",
  FINANCIAL_CHALLENGES: "entry.1076060942",
  INTERNET_ACCESS: "entry.1739812924",
  ELECTRICITY_ISSUES: "entry.814693417",
  ATTENDANCE: "entry.985438748",
  ASSIGNMENT_SUBMISSION: "entry.1654264532",
  STUDY_HOURS: "entry.1187571751",
  STUDY_SCHEDULE: "entry.1322392457",
  PROCRASTINATION: "entry.723355431",
  PEER_INFLUENCE: "entry.1497619785",
  COURSE_DIFFICULTY: "entry.46677698",
  DISTRACTION: "entry.1013279790",
  STRESS: "entry.1503731386",
  MISSED_ASSESSMENTS: "entry.1642173318",
  CARRYOVERS: "entry.1420102139",
  PROBATION: "entry.1612551183",
  WITHDRAWAL: "entry.1735020740",
  PERFORMANCE_RATING: "entry.264996985",
  PART_TIME_WORK: "entry.1734738087",
  WORK_HOURS: "entry.925308420",
  EXTRACURRICULAR: "entry.631810206",
  WILLING_INTERVENTION: "entry.1506269894",
};

// ============================================================
// OPTION POOLS - Cleaned up duplicates
// ============================================================
const DEPARTMENTS = [
  "Computer Science",
  "Software Engineering",
  "Data Science",
  "Information Technology",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Biochemistry",
  "Microbiology",
  "Chemistry",
  "Biology",
  "Physics",
  "Mathematics",
  "Statistics",
  "Economics",
  "Accounting",
  "Business Administration",
  "Food Science and Technology",
  "Environmental Science",
  "Geology",
  "Veterinary Medicine",
  "Animal Science",
  "Agricultural Science",
  "Zoology",
  "Library and Information Science",
  "Forestry and Wildlife",
];

// Gender-balanced department assignments
const MALE_DOMINATED_DEPTS = [
  "Computer Science",
  "Software Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Physics",
  "Mathematics",
];

const FEMALE_DOMINATED_DEPTS = [
  "Biochemistry",
  "Microbiology",
  "Biology",
  "Food Science and Technology",
  "Library and Information Science",
  "Accounting",
  "Business Administration",
];

const NEUTRAL_DEPTS = [
  "Data Science",
  "Information Technology",
  "Chemistry",
  "Statistics",
  "Economics",
  "Environmental Science",
  "Geology",
  "Veterinary Medicine",
  "Animal Science",
  "Agricultural Science",
  "Zoology",
  "Forestry and Wildlife",
];

const LIKERT = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree",
];

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
  const val = Math.floor(Math.random() * 9e15);
  return (sign * val).toString();
}

function fmtMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// Department selection based on gender
function selectDepartment(gender) {
  const rand = Math.random();
  if (gender === "Male") {
    if (rand < 0.6) return pick(MALE_DOMINATED_DEPTS);
    if (rand < 0.9) return pick(NEUTRAL_DEPTS);
    return pick(FEMALE_DOMINATED_DEPTS);
  } else {
    if (rand < 0.6) return pick(FEMALE_DOMINATED_DEPTS);
    if (rand < 0.9) return pick(NEUTRAL_DEPTS);
    return pick(MALE_DOMINATED_DEPTS);
  }
}

// Level distribution based on realistic enrollment patterns
function selectLevel() {
  // More students in lower levels due to dropout rates
  return weightedPick(
    [
      "100 Level",
      "200 Level",
      "300 Level",
      "400 Level",
      "500 Level",
      "600 Level",
    ],
    [0, 50, 30, 20, 0, 0]
  );
}

// ============================================================
// SMART RANDOM DELAY
// ============================================================
function getNextDelay(submittedSoFar, elapsedMs) {
  // Simple random delay between 5 minutes and 1 hour
  return (
    Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS
  );
}

// ============================================================
// ACTIVE SLEEP
// ============================================================
const HEARTBEAT_MESSAGES = [
  "still running...",
  "waiting before next submission...",
  "script is alive...",
  "holding off before next request...",
  "standing by...",
  "pausing between submissions...",
  "all good, just waiting...",
  "next submission coming up...",
  "idling intentionally...",
  "running smoothly, please wait...",
];

function activeSleep(totalMs, submittedSoFar, totalTarget) {
  return new Promise((resolve) => {
    const deadline = Date.now() + totalMs;
    let elapsed = 0;

    function tick() {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        process.stdout.write("\n");
        return resolve();
      }

      // Heartbeat every 60 seconds (1 minute)
      const tickInterval = 60000;
      const waitFor = Math.min(tickInterval, remaining);

      setTimeout(() => {
        elapsed += waitFor;
        const remainingSec = ((deadline - Date.now()) / 1000).toFixed(0);
        const msg = pick(HEARTBEAT_MESSAGES);
        const pct = ((submittedSoFar / totalTarget) * 100).toFixed(1);
        console.log(
          `  [WAIT] ${msg} | next in ~${remainingSec}s (${(
            remainingSec / 60
          ).toFixed(
            1
          )}m) | progress: ${submittedSoFar}/${totalTarget} (${pct}%)`
        );
        tick();
      }, waitFor);
    }

    tick();
  });
}

// ============================================================
// PROFILE GENERATORS - Realistic distributions
// ============================================================
function notAtRiskProfile(gender) {
  // Well-performing students with good habits
  const workPT = Math.random() < 0.1 ? "Yes" : "No";
  const level = selectLevel();

  return {
    [F.GENDER]: gender,
    [F.LEVEL]: level,
    // Good CGPA distribution for non-risk students
    [F.CGPA]: weightedPick(
      ["4.50 – 5.00", "3.50 – 4.49", "2.40 – 3.49", "1.50 – 2.39"],
      [10, 54, 35, 1]
    ),
    [F.PARENT_EDUCATION]: weightedPick(["Yes", "No"], [90, 10]),
    // Low financial challenges
    [F.FINANCIAL_CHALLENGES]: likert([35, 35, 15, 10, 5]),
    // Good internet and electricity
    [F.INTERNET_ACCESS]: likert([3, 7, 10, 35, 45]),
    [F.ELECTRICITY_ISSUES]: likert([40, 30, 15, 10, 5]),
    // Excellent attendance and submissions
    [F.ATTENDANCE]: likert([2, 3, 5, 35, 55]),
    [F.ASSIGNMENT_SUBMISSION]: likert([1, 2, 7, 35, 55]),
    // Good study habits
    [F.STUDY_HOURS]: weightedPick(
      [
        "More than 6 hours",
        "5 – 6 hours",
        "3 – 4 hours",
        "1 – 2 hours",
        "Less than 1 hour",
      ],
      [15, 35, 35, 10, 5]
    ),
    [F.STUDY_SCHEDULE]: weightedPick(
      ["Always", "Often", "Sometimes", "Rarely", "Never"],
      [35, 40, 15, 7, 3]
    ),
    [F.PROCRASTINATION]: likert([3, 20, 30, 7, 40]),
    [F.PEER_INFLUENCE]: likert([2, 5, 10, 40, 43]),
    [F.COURSE_DIFFICULTY]: likert([20, 35, 10, 10, 25]),
    [F.DISTRACTION]: likert([35, 35, 15, 10, 5]),
    [F.STRESS]: likert([20, 30, 5, 15, 30]),
    // Rare academic issues
    [F.MISSED_ASSESSMENTS]: likert([60, 25, 10, 3, 2]),
    [F.CARRYOVERS]: weightedPick(
      ["None", "1 – 2", "3 – 4", "More than 4"],
      [85, 12, 2, 1]
    ),
    [F.PROBATION]: weightedPick(["Yes", "No"], [0, 100]),
    [F.WITHDRAWAL]: weightedPick(["Yes", "No"], [0.5, 99.5]),
    [F.PERFORMANCE_RATING]: weightedPick(
      ["Excellent", "Very Good", "Good", "Fair", "Poor"],
      [30, 60, 10, 0, 0]
    ),
    [F.PART_TIME_WORK]: workPT,
    [F.WORK_HOURS]:
      workPT === "Yes"
        ? weightedPick(
            [
              "Less than 5 hours",
              "5 – 10 hours",
              "11 – 20 hours",
              "21 – 30 hours",
              "More than 30 hours",
            ],
            [50, 35, 10, 4, 1]
          )
        : "Not Applicable",
    [F.EXTRACURRICULAR]: weightedPick(["Yes", "No"], [60, 40]),
    [F.WILLING_INTERVENTION]: weightedPick(["Yes", "No"], [75, 25]),
  };
}

function moderateRiskProfile(gender) {
  const workPT = Math.random() < 0.3 ? "Yes" : "No";
  const level = selectLevel();

  return {
    [F.GENDER]: gender,
    [F.LEVEL]: level,
    [F.CGPA]: weightedPick(
      ["3.50 – 4.49", "2.40 – 3.49", "1.50 – 2.39", "Below 1.50"],
      [0, 54, 45, 1]
    ),
    [F.PARENT_EDUCATION]: weightedPick(["Yes", "No"], [96, 4]),
    [F.FINANCIAL_CHALLENGES]: likert([15, 20, 25, 25, 15]),
    [F.INTERNET_ACCESS]: likert([10, 20, 25, 25, 20]),
    [F.ELECTRICITY_ISSUES]: likert([15, 20, 25, 25, 15]),
    [F.ATTENDANCE]: likert([10, 15, 25, 30, 20]),
    [F.ASSIGNMENT_SUBMISSION]: likert([8, 12, 25, 35, 20]),
    [F.STUDY_HOURS]: weightedPick(
      [
        "3 – 4 hours",
        "1 – 2 hours",
        "5 – 6 hours",
        "More than 6 hours",
        "Less than 1 hour",
      ],
      [30, 35, 15, 5, 15]
    ),
    [F.STUDY_SCHEDULE]: weightedPick(
      ["Sometimes", "Often", "Rarely", "Always", "Never"],
      [35, 25, 20, 10, 10]
    ),
    [F.PROCRASTINATION]: likert([10, 15, 25, 30, 20]),
    [F.PEER_INFLUENCE]: likert([8, 15, 25, 30, 22]),
    [F.COURSE_DIFFICULTY]: likert([10, 15, 30, 30, 15]),
    [F.DISTRACTION]: likert([10, 15, 25, 30, 20]),
    [F.STRESS]: likert([5, 15, 25, 35, 20]),
    [F.MISSED_ASSESSMENTS]: likert([20, 25, 25, 20, 10]),
    [F.CARRYOVERS]: weightedPick(
      ["None", "1 – 2", "3 – 4", "More than 4"],
      [40, 40, 15, 5]
    ),
    [F.PROBATION]: weightedPick(["Yes", "No"], [10, 90]),
    [F.WITHDRAWAL]: weightedPick(["Yes", "No"], [12, 88]),
    [F.PERFORMANCE_RATING]: weightedPick(
      ["Good", "Very Good", "Fair", "Excellent", "Poor"],
      [40, 20, 25, 5, 10]
    ),
    [F.PART_TIME_WORK]: workPT,
    [F.WORK_HOURS]:
      workPT === "Yes"
        ? weightedPick(
            [
              "5 – 10 hours",
              "11 – 20 hours",
              "Less than 5 hours",
              "21 – 30 hours",
              "More than 30 hours",
            ],
            [35, 30, 20, 10, 5]
          )
        : "Not Applicable",
    [F.EXTRACURRICULAR]: weightedPick(["Yes", "No"], [45, 55]),
    [F.WILLING_INTERVENTION]: weightedPick(["Yes", "No"], [70, 30]),
  };
}

function atRiskProfile(gender) {
  const workPT = Math.random() < 0.45 ? "Yes" : "No";
  const level = selectLevel();

  return {
    [F.GENDER]: gender,
    [F.LEVEL]: level,
    [F.CGPA]: weightedPick(
      ["1.50 – 2.39", "Below 1.50", "2.40 – 3.49"],
      [40, 40, 20]
    ),
    [F.PARENT_EDUCATION]: weightedPick(["Yes", "No"], [35, 65]),
    [F.FINANCIAL_CHALLENGES]: likert([3, 7, 15, 35, 40]),
    [F.INTERNET_ACCESS]: likert([25, 30, 25, 15, 5]),
    [F.ELECTRICITY_ISSUES]: likert([5, 10, 15, 35, 35]),
    [F.ATTENDANCE]: likert([25, 30, 25, 15, 5]),
    [F.ASSIGNMENT_SUBMISSION]: likert([25, 30, 25, 15, 5]),
    [F.STUDY_HOURS]: weightedPick(
      [
        "Less than 1 hour",
        "1 – 2 hours",
        "3 – 4 hours",
        "5 – 6 hours",
        "More than 6 hours",
      ],
      [40, 35, 15, 7, 3]
    ),
    [F.STUDY_SCHEDULE]: weightedPick(
      ["Never", "Rarely", "Sometimes", "Often", "Always"],
      [35, 35, 20, 7, 3]
    ),
    [F.PROCRASTINATION]: likert([3, 7, 15, 35, 40]),
    [F.PEER_INFLUENCE]: likert([20, 25, 30, 15, 10]),
    [F.COURSE_DIFFICULTY]: likert([3, 7, 15, 40, 35]),
    [F.DISTRACTION]: likert([3, 7, 15, 35, 40]),
    [F.STRESS]: likert([3, 7, 10, 35, 45]),
    [F.MISSED_ASSESSMENTS]: likert([3, 7, 15, 35, 40]),
    [F.CARRYOVERS]: weightedPick(
      ["More than 4", "3 – 4", "1 – 2", "None"],
      [35, 35, 20, 10]
    ),
    [F.PROBATION]: weightedPick(["Yes", "No"], [45, 55]),
    [F.WITHDRAWAL]: weightedPick(["Yes", "No"], [40, 60]),
    [F.PERFORMANCE_RATING]: weightedPick(
      ["Poor", "Fair", "Good", "Very Good", "Excellent"],
      [45, 35, 15, 4, 1]
    ),
    [F.PART_TIME_WORK]: workPT,
    [F.WORK_HOURS]:
      workPT === "Yes"
        ? weightedPick(
            [
              "11 – 20 hours",
              "21 – 30 hours",
              "More than 30 hours",
              "5 – 10 hours",
              "Less than 5 hours",
            ],
            [30, 30, 25, 10, 5]
          )
        : "Not Applicable",
    [F.EXTRACURRICULAR]: weightedPick(["Yes", "No"], [25, 75]),
    [F.WILLING_INTERVENTION]: weightedPick(["Yes", "No"], [55, 45]),
  };
}

// ============================================================
// BUILD & SHUFFLE POOL WITH GENDER BALANCE
// ============================================================
function buildPool() {
  const pool = [];
  const genderStats = { male: 0, female: 0 };

  // Helper to add profiles with gender balance
  function addProfiles(count, riskClass, profileFn) {
    for (let i = 0; i < count; i++) {
      // Alternate genders to ensure balance
      const targetGender =
        genderStats.male <= genderStats.female ? "Male" : "Female";
      const actualGender =
        Math.random() < GENDER_RATIO.MALE ? "Male" : "Female";
      const gender =
        Math.abs(genderStats.male - genderStats.female) > 2
          ? targetGender
          : actualGender;

      genderStats[gender === "Male" ? "male" : "female"]++;
      pool.push({
        cls: riskClass,
        fn: profileFn,
        gender: gender,
      });
    }
  }

  addProfiles(DISTRIBUTION.NOT_AT_RISK, "Not At Risk", notAtRiskProfile);
  addProfiles(DISTRIBUTION.MODERATE_RISK, "Moderate Risk", moderateRiskProfile);
  addProfiles(DISTRIBUTION.AT_RISK, "At Risk", atRiskProfile);

  // Shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}

// ============================================================
// SUBMIT
// ============================================================
function submitForm(fields, department) {
  return new Promise((resolve, reject) => {
    const fbzx = randFbzx();

    const payload = {
      ...fields,
      [F.DEPARTMENT]: department,
      fvv: "1",
      draftResponse: `[null,null,"${fbzx}"]`,
      pageHistory: "0",
      fbzx: fbzx,
      submissionTimestamp: Date.now().toString(),
    };

    Object.keys(payload)
      .filter((k) => k.startsWith("entry."))
      .forEach((k) => {
        payload[k + "_sentinel"] = "";
      });

    const postData = querystring.stringify(payload);

    const options = {
      hostname: "docs.google.com",
      path: `/forms/u/0/d/e/${FORM_ID}/formResponse`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: `https://docs.google.com/forms/d/e/${FORM_ID}/viewform?fbzx=${fbzx}`,
        Origin: "https://docs.google.com",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Connection: "keep-alive",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        const confirmed =
          body.includes("freebirdFormviewerViewResponseConfirmationMessage") ||
          body.includes("Your response has been recorded") ||
          body.includes("recordedAnswer");
        resolve({
          status: res.statusCode,
          confirmed,
          location: res.headers["location"],
        });
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const pool = buildPool();
  const stats = {
    success: 0,
    confirmed: 0,
    failed: 0,
    notAtRisk: 0,
    moderateRisk: 0,
    atRisk: 0,
    male: 0,
    female: 0,
  };
  const start = Date.now();

  console.log("=".repeat(68));
  console.log("  Google Form Realistic Response Submitter");
  console.log(`  Target : ${TOTAL_RESPONSES} responses`);
  console.log(
    `  Gender Ratio : ${(GENDER_RATIO.MALE * 100).toFixed(0)}% Male / ${(
      GENDER_RATIO.FEMALE * 100
    ).toFixed(0)}% Female`
  );
  console.log(
    `  Delay  : ${fmtMs(DELAY_MIN_MS)} – ${fmtMs(
      DELAY_MAX_MS
    )} randomly between submissions`
  );
  console.log(
    `  Split  : Not At Risk=${DISTRIBUTION.NOT_AT_RISK}, Moderate=${DISTRIBUTION.MODERATE_RISK}, At Risk=${DISTRIBUTION.AT_RISK}`
  );
  console.log("=".repeat(68));

  for (let i = 0; i < pool.length; i++) {
    const { cls, fn, gender } = pool[i];
    const profile = fn(gender);
    const department = selectDepartment(gender);

    try {
      const { status, confirmed, location } = await submitForm(
        profile,
        department
      );
      const ok =
        confirmed ||
        status === 302 ||
        (location && location.includes("formResponse"));

      if (ok) {
        stats.success++;
        stats.confirmed++;
        if (cls === "Not At Risk") stats.notAtRisk++;
        if (cls === "Moderate Risk") stats.moderateRisk++;
        if (cls === "At Risk") stats.atRisk++;
        if (gender === "Male") stats.male++;
        if (gender === "Female") stats.female++;
      } else {
        stats.failed++;
      }

      const elapsed = Date.now() - start;
      const pct = (((i + 1) / pool.length) * 100).toFixed(1);
      const hoursElapsed = elapsed / 3600000;
      const rate =
        hoursElapsed > 0 ? (stats.confirmed / hoursElapsed).toFixed(1) : "–";
      const icon = ok ? "✓" : "✗";
      const note = confirmed
        ? "confirmed"
        : `HTTP ${status}${location ? " →" : ""}`;

      if (i < pool.length - 1) {
        const nextDelay = getNextDelay(stats.confirmed, elapsed);
        console.log(
          `[${String(i + 1).padStart(4, "0")}/${
            pool.length
          }] ${icon} ${cls.padEnd(14)} ${gender.padEnd(6)} | ${note.padEnd(
            12
          )} | ${pct}% | ${fmtElapsed(elapsed)} | next: ${fmtMs(nextDelay)}`
        );
        await activeSleep(nextDelay, stats.confirmed, TOTAL_RESPONSES);
      } else {
        console.log(
          `[${String(i + 1).padStart(4, "0")}/${
            pool.length
          }] ${icon} ${cls.padEnd(14)} ${gender.padEnd(6)} | ${note.padEnd(
            12
          )} | ${pct}% | ${fmtElapsed(elapsed)}`
        );
      }
    } catch (err) {
      stats.failed++;
      console.error(`[${i + 1}] ✗ ERROR: ${err.message}`);
    }
  }

  const mins = ((Date.now() - start) / 60000).toFixed(1);
  const hours = (mins / 60).toFixed(1);
  console.log("\n" + "=".repeat(68));
  console.log("FINAL SUMMARY");
  console.log("=".repeat(68));
  console.log(`✓ Confirmed      : ${stats.confirmed}`);
  console.log(`✗ Failed         : ${stats.failed}`);
  console.log(`  Not At Risk    : ${stats.notAtRisk}`);
  console.log(`  Moderate Risk  : ${stats.moderateRisk}`);
  console.log(`  At Risk        : ${stats.atRisk}`);
  console.log(`  Male           : ${stats.male}`);
  console.log(`  Female         : ${stats.female}`);
  console.log(
    `  Total time     : ${fmtElapsed(Date.now() - start)} (${hours} hours)`
  );
  console.log("=".repeat(68));
}

main().catch(console.error);
