# Debate Critic

Analyzing some language from the 2016 presidential debates. The reports can be viewed in the `reports` folder.

### Reports:
| Debate Date      | Report   |
| ---------------- | -------- |
| August 6, 2015   | [Republican Debate #1](reports/republican-candidates-debate-1-2015-08-06.json) (1 of 2)|
| August 6, 2015   | [Republican Debate #1](reports/republican-candidates-debate-2-2015-08-06.json) (2 of 2)|
| September 16, 2015   | [Republican Debate #1](reports/republican-candidates-debate-1-2015-09-16.json) (1 of 2) |
| September 16, 2015   | [Republican Debate #2](reports/republican-candidates-debate-2-2015-09-16.json) (2 of 2) |
| October 13, 2015 | [Democratic Debate #1](reports/democratic-candidates-debate-2015-10-13.json) |
| October 28, 2015 | [Republican Debate #3](reports/republican-candidates-debate-2015-10-28.json) |

### Points of Analysis:
- Total words spoken
- Articulation (unique words against total spoken)
- Issue importance (per claimed issues, per debate presented issue via **TFIDF**)
- Estimated speaking time

### TODO:
- [x] Finish Democrat campaign website parser
- [x] Finish Republican campaign website parser (only a few more...)
- [x] Word counts (per issue, overall responses)
- [x] STATS: Inter-party-related negative and positive statements
    - [ ] Need better context on names used
- [ ] STATS: More specifics on name-calling and the such
- [ ] FACT CHECKS (lies/no lies)

### Crawler CLI

Haven't tested historical presidential debates, though it *should* mostly work out. Transcripts are grabbed from [The American Presidency Project](http://www.presidency.ucsb.edu/debates.php), which has debate transcripts back to 1960.

```
debate-critic/ $> node src/crawler

 crawler [options] [election year]

 options
     -t, --transcripts    - Get election year debate transcripts
     -c, --candidates     - Get election year candidate information
     -i, --issues         - Get election year issues


debate-critic/ $> node src/crawler 2016

```

### Thank you
- [The American Presidency Project](http://www.presidency.ucsb.edu/debates.php)