#!/bin/bash

## 
# This script is to be executed by the tooling server every time there is a push
# to nupic master branch. It is currently used to:
# - generate nupic and nupic.core documentation
# - update the sha in nupic.regression of the latest commit pushed
#
## Assumptions
#
# - numenta/nupic is checked out somewhere within reach cloned from  
#   git@github.com:numenta/nupic.git as `origin`.
#   - $NUPIC points to the location of this checkout.
#
# - numenta/nupic.core is checked out out somewhere within reach cloned from
#   git@github.com:numenta/nupic.core.git as `origin`.
#   - $NUPIC_CORE points to the location of this checkout.
#
# - numenta/nupic.regression is checked out out somewhere within reach cloned from
#   git@github.com:numenta/nupic.regression.git as `origin`.
#   - $NUPIC_REGRESSION points to the location of this checkout.
#
# - numenta/numenta.org repository is checked out from 
#   https://github.com/numenta/numenta.org
#   - $NUMENTA_ORG points to the location of this checkout

if [ -z "$NUPIC" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC environment variable set to the numenta/nupic checkout."
    exit 1
fi
if [ -z "$NUPIC_CORE" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC_CORE environment variable set to the numenta/nupic.core checkout."
    exit 1
fi
if [ -z "$NUMENTA_ORG" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUMENTA_ORG environment variable set to the numenta/numenta.org checkout."
    exit 1
fi
if [ -z "$NUPIC_REGRESSION" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC_REGRESSION environment variable set to the numenta/nupic.regression checkout."
    exit 1
fi

cwd=`pwd`

echo
echo "Building NuPIC API docs..."
echo

cd $NUPIC

echo
echo "Checking out numenta/nupic master branch for doxygen build..."
git checkout master
git pull origin master
doxygen

cwd=`pwd`
cd $NUPIC_CORE

echo
echo "Checking out numenta/nupic.core master branch for doxygen build..."
git checkout master
git pull origin master
doxygen

echo "Checking out numenta/numenta.org gh-pages branch for documentation push..."
cd $NUMENTA_ORG
git fetch origin
git merge origin/gh-pages --no-edit
# move html directories into right place
rm -rf docs/nupic docs/nupic.core
mv $NUPIC/html $NUMENTA_ORG/docs/nupic
mv $NUPIC_CORE/html $NUMENTA_ORG/docs/nupic.core
# add new docs
git add docs
# commit new docs
git commit -m "NuPIC Doxygen automated doc build."
# push new docs
git push origin gh-pages

echo
echo "Done building and pushing new docs."
echo

echo
echo "Updating nupic.regression with newest commit sha on master..."
echo

cd $NUPIC
sha=`git log -1 --pretty=oneline | sed -E "s/^([^[:space:]]+).*/\1/" | tr -d ' '`
cd $NUPIC_REGRESSION
echo $sha > nupic_sha.txt
git add nupic_sha.txt
git commit -m "Automated update of nupic master sha to ${sha}."
git push origin master

echo 
echo "Done updating nupic.regression."
echo

cd $cwd
