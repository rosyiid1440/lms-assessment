# Performance Regression Report

| Benchmark | Concurrency | Total Ops | P50 (ms) | P95 (ms) | Target P95 | Status |
|-----------|-------------|-----------|----------|----------|------------|--------|
| Grade Ledger Entry & Projection Recalculation | 100 | 500 | 97.37 | **237.56** | <= *Failed* | ❌ FAIL |
| Student Dashboard Projection Read | 200 | 1000 | 63.93 | **108.64** | <= *Failed* | ❌ FAIL |
