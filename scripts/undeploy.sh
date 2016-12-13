#!/usr/bin/env bash

set -e

rm dist/*
echo test > dist/index.html
./scripts/deploy.sh
