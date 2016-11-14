#!/bin/sh -x

echo "upstream - synch - updating"
git checkout master
git fetch upstream
git merge upstream/master
