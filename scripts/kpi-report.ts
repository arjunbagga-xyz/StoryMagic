// scripts/kpi-report.ts
// Pulls REAL GitHub repo stats for StoryMagic (no token needed for a public repo).
// Run: npm run kpi
//
// This is the source of truth for the "stars / forks" KPIs in the marketing plan.
// Newsletter / Show-HN-visits / app-session numbers come from Buttondown / Plausible
// dashboards respectively (see KPI_TRACKING.md).

const REPO = process.env.SM_REPO || 'arjunbagga-xyz/StoryMagic';

async function main() {
  const url = `https://api.github.com/repos/${REPO}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'storymagic-kpi' },
  });
  if (!res.ok) {
    console.error('GitHub API error', res.status, await res.text());
    process.exit(1);
  }
  const d = (await res.json()) as any;
  const out = {
    repo: REPO,
    stars: d.stargazers_count,
    forks: d.forks_count,
    watchers: d.subscribers_count,
    open_issues: d.open_issues_count,
    license: d.license?.spdx_id,
    created: d.created_at,
    last_push: d.pushed_at,
    url: d.html_url,
  };
  console.log('=== StoryMagic KPI snapshot ===');
  console.log(JSON.stringify(out, null, 2));

  console.log('\n--- Targets (Month 1) ---');
  console.log('stars 60-150  | forks 10-30  | newsletter 50-150  | Show HN visits 300-1000');
  console.log('--- Targets (Month 2) ---');
  console.log('stars 150-400 | forks 30-90  | newsletter 200-500');

  const stars = d.stargazers_count as number;
  const m1 = stars >= 60 && stars <= 150;
  const m2 = stars >= 150 && stars <= 400;
  console.log(`\nStar check: ${stars} -> ${m1 ? 'WITHIN M1 range' : m2 ? 'WITHIN M2 range' : stars < 60 ? 'below M1 floor' : 'above M2 ceiling'}`);
}

main();
