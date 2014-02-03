#!/bin/bash

## Assumptions
# - NuPIC is checked out somewhere within reach cloned from  
#   git@github.com:numenta/nupic.git as `origin`.
#   - $NUPIC points to the location of this checkout.
# - numenta.org repository is checked out from 
#   https://github.com/numenta/numenta.org
#   - $NUMENTA_ORG points to the location of this checkout

echo
echo "Building NuPIC API docs from $NUPIC"
echo

if [ -z "$NUPIC" ]; then
    echo "In order for this script to run properly, you must have the "
    echo "\$NUPIC environment variable set to the NuPIC checkout."
    exit 1
fi

cwd=`pwd`
cd $NUPIC

echo "Checking out NuPIC master branch for doxygen build..."
git checkout master
git pull origin master

echo "Running Doxygen..."
doxygen

echo "Checking out NuPIC gh-pages branch for documentation push..."
cd $NUMENTA_ORG
git fetch origin
git merge origin/gh-pages --no-edit
# move html directory into right place
rm -rf docs
mv $NUPIC/html $NUMENTA_ORG/docs
# add new docs
git add docs
# commit new docs
git commit -m "NuPIC Doxygen automated doc build."
# push new docs
git push origin gh-pages

echo
echo Done.

cd $cwd
