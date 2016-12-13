#!/usr/bin/env bash

set -e

rm -rf dist/.git
cd dist
git init .
git remote add gh git@github.com:msbarry/babymap.git
git checkout -b gh-pages
git add -A .
git commit -m "deploy"
git push -u -f gh gh-pages
open http://msbarry.github.io/babymap
