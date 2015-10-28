# Debate Critic

Analyzing some language from the 2016 presidential debates. The reports can be viewed in the `reports` folder.

### Reports:
| Debate Date      | Report   |
| ---------------- | -------- |
| August 6, 2015   | [Republican Debate #1](reports/republican-debate-1-2015-08-06.json) (1 of 2)|
| August 6, 2015   | [Republican Debate #1](reports/republican-debate-2-2015-08-06.json) (2 of 2)|
| September 16, 2015   | [Republican Debate #1](reports/republican-debate-1-2015-09-16.json) (1 of 2) |
| September 16, 2015   | [Republican Debate #2](reports/republican-debate-2-2015-09-16.json) (2 of 2) |
| October 13, 2015 | [Democratic Debate #1](reports/democratic-debate-2015-10-13.json) |

### Points of Analysis:
- Total words spoken
- Articulation (unique words against total spoken)
- Issue importance (per claimed issues, per debate presented issue via **TFIDF**)
- Estimated speaking time

### Log
#### 10-18-2015
In parsing Hillary's site was the by far the worst. I managed to get every other candidate in both the republican and democratic parties with a relatively similar standard selectors.

### TODO:
- [x] Finish Democrat campaign website parser
- [x] Finish Republican campaign website parser (only a few more...)
- [x] Word counts (per issue, overall responses)
- [x] STATS: Inter-party-related negative and positive statements
- [ ] STATS: More specifics on name-calling and the such
- [ ] FACT CHECKS (lies/no lies)
