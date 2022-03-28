#!/bin/bash 

BUNDLE_FILE=$1
INTERVIWEE_NAME=$2

echo Submitting for $INTERVIWEE_NAME ...

set -ex
git bundle verify "$BUNDLE_FILE"
git bundle unbundle "$BUNDLE_FILE"
git fetch "$BUNDLE_FILE" part1:$INTERVIWEE_NAME
git checkout $INTERVIWEE_NAME
git fetch origin part1-tests
git merge origin/part1-tests -m "Merge in test branch"
git push --set-upstream origin $INTERVIWEE_NAME

