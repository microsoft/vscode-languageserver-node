#!/bin/sh -x

#  1840  git remote -v
#  1841  git remote -vv
#  1842  git branch -v
#  1843  git remote --help
#  1844  git show
#  1845  git remote --help
#  1846  git remote show
#  1847  git remote show -v
#  1848  git remote -v show
#  1849  git remote add upstream git@github.com:Microsoft/vscode-languageserver-node.git
#  1850  git remote -v
#  1851  git remote --v
#  1852  git remote -vv
#  1853  git fetch upstream
#  1854  git checkout master
#  1855  git merge upstream/master


echo "---------------------------------"
echo "Updating master to match upstream"
git checkout master
git fetch upstream
git merge upstream/master
echo "---------------------------------"

