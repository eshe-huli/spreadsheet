# Spreadsheet interview project

**For candidates:** Look in the subdirectory corresponding to the language
you're doing the interview in. Everything you need should be there.

**For Wave engineers:** If you're doing development on this project, see the
"development recipes" section below.

## Development recipes

To run the tests on a candidate's code in gitlab:

* Download the candidate's bundle file from Greenhouse or from their email.
* From the root of the repository, run `./push_to_gitlab.sh <bundle_file> <candidate_name_with_no_spaces>`.
* In gitlab, click the "pipelines" tab to see the running tests (they don't take very long).


To build the docs (assuming you've already followed the Python dev setup):

```
npm install -g jsdoc
source python/.venv/bin/activate
make html
```

To make changes to the interview code:

* Make sure if you’re making a change, it’s going on the right branch
    * Things pertaining to part1 need to be on the part1 branch to make it to interviewees
    * Tests for part1 should be made on the part1-tests branch
    * Things pertaining to part2 should be only on the part2 branch, to avoid interviewees being confused or distracted by it while doing part1
    * Instructions for both should go on the appropriate branches, but please note that instructions and bundle files are built on the part2 branch only
* Once you’ve made changes in the part1 branch, please also update the part1-tests and part2 branches by rebasing off of part1.  Rebasing is annoying and dangerous, because you then have to force push, but it also helps us keep ourselves from having random collections of commits on each branch.

Bundles to send to candidates are automatically created in CI, so you don't need to go through a manual process to do this.