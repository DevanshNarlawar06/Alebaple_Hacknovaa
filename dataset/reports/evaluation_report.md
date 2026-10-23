# Evaluation report — 2026-10-23T20:04:48Z

> ⚠️ Includes cases NOT yet human-reviewed (development run). Do not quote on slides.

Cases: 7 · Accuracy 0.857 · Macro-F1 0.867 · Critical errors 0 · Median latency 10.15 s

| Status | P | R | F1 | n |
|---|---|---|---|---|
| VERIFIED | 1.0 | 0.667 | 0.8 | 3 |
| CONFLICTING | 1.0 | 1.0 | 1.0 | 1 |
| OUTDATED | 1.0 | 1.0 | 1.0 | 2 |
| UNVERIFIED | 0.5 | 1.0 | 0.667 | 1 |

## Confusion (rows = expected)
| | VERIFIED | CONFLICTING | OUTDATED | UNVERIFIED |
|---|---|---|---|---|
| VERIFIED | 2 | 0 | 0 | 1 |
| CONFLICTING | 0 | 1 | 0 | 0 |
| OUTDATED | 0 | 0 | 2 | 0 |
| UNVERIFIED | 0 | 0 | 0 | 1 |

## Cases
| Case | Ctx | Expected | Predicted | Failure |
|---|---|---|---|---|
| clm_pilot_001:HISTORICAL | HISTORICAL | VERIFIED | VERIFIED |  |
| clm_pilot_002:HISTORICAL | HISTORICAL | CONFLICTING | CONFLICTING |  |
| clm_pilot_003:HISTORICAL | HISTORICAL | VERIFIED | VERIFIED |  |
| clm_pilot_003:CURRENT | CURRENT | OUTDATED | OUTDATED |  |
| clm_pilot_004:HISTORICAL | HISTORICAL | UNVERIFIED | UNVERIFIED |  |
| clm_pilot_005:HISTORICAL | HISTORICAL | VERIFIED | UNVERIFIED | geographic failure |
| clm_pilot_005:CURRENT | CURRENT | OUTDATED | OUTDATED |  |