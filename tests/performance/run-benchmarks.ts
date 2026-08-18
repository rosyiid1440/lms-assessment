import { runGradebookBenchmarks } from './scenarios/gradebook.bench';
import { disconnectDatabase } from '../utils/db-reset';
import * as fs from 'fs';

async function main() {
  const allResults = [];

  try {
    // Execute suites
    // (In reality, we'd also await runAuthBenchmarks(), runCacheBenchmarks(), etc.)
    const gradeResults = await runGradebookBenchmarks();
    allResults.push(...gradeResults);

    // Generate JSON Report for CI/CD
    const reportPath = './tests/performance/benchmark-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
    console.log(`\n📄 JSON Report saved to: ${reportPath}`);

    // Generate Markdown Summary
    let md = '# Performance Regression Report\n\n';
    md += '| Benchmark | Concurrency | Total Ops | P50 (ms) | P95 (ms) | Target P95 | Status |\n';
    md += '|-----------|-------------|-----------|----------|----------|------------|--------|\n';
    
    let hasRegression = false;

    for (const r of allResults) {
      const status = r.passed ? '✅ Pass' : '❌ FAIL';
      if (!r.passed) hasRegression = true;
      md += `| ${r.name} | ${r.concurrency} | ${r.totalOperations} | ${r.metrics.p50.toFixed(2)} | **${r.metrics.p95.toFixed(2)}** | <= ${r.passed ? 'N/A' : '*Failed*'} | ${status} |\n`;
    }

    fs.writeFileSync('./tests/performance/benchmark-report.md', md);
    console.log(`📄 Markdown Report saved to: ./tests/performance/benchmark-report.md\n`);

    if (hasRegression) {
      console.error('🚨 PERFORMANCE REGRESSION DETECTED. Failing CI Pipeline.');
      process.exit(1);
    } else {
      console.log('🌟 All Benchmarks Passed the Baseline Thresholds.');
    }

  } catch (err) {
    console.error('Fatal Error during benchmarks:', err);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();
